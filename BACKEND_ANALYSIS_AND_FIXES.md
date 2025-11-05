# Backend Text Generation & Whisper Integration Analysis

## 🔍 Issues Identified

### 1. **Whisper Speech-to-Text Failure ("Failed on local")**

**Root Causes:**

- Frontend is calling `/whisper/transcribe` endpoint that likely doesn't exist in your backend
- No backend route handler for Whisper transcription
- Missing OpenAI Whisper integration in backend

**Current Frontend Call:**

```typescript
const res = await api.post("/whisper/transcribe", fd, {
  headers: { "Content-Type": "multipart/form-data" },
  timeout: 120000,
});
```

**Missing Backend Endpoint:** `/whisper/transcribe`

---

### 2. **Task Parsing Issues**

**Problems in `TextGenerationService.generateTask()`:**

1. **Priority Extraction** ✅ (Good)

   - Priority normalization is comprehensive
   - Handles multiple languages and scales
   - Logs are helpful for debugging

2. **Missing DueDate Extraction** ❌

   - The service generates `title`, `description`, `priority`
   - **Does NOT extract `dueDate`** despite user need
   - Frontend expects `dueDate` but backend doesn't provide it

3. **Missing Status Extraction** ❌

   - No status extraction logic
   - Frontend expects `status` for TODO/IN_PROGRESS/DONE/CANCELLED
   - Backend doesn't provide this field

4. **JSON Parsing Brittleness** ⚠️
   - Multiple cleanup attempts (good)
   - But could fail on edge cases
   - No structured schema enforcement

---

## 🔧 Required Backend Fixes

### Fix 1: Add Whisper Transcription Endpoint

You need to create a NestJS controller and service for Whisper:

```typescript
// whisper.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { WhisperService } from "./whisper.service";

@Controller("whisper")
export class WhisperController {
  private readonly logger = new Logger(WhisperController.name);

  constructor(private readonly whisperService: WhisperService) {}

  @Post("transcribe")
  @UseInterceptors(FileInterceptor("audio"))
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
    @Body("sessionId") sessionId?: string,
    @Body("chunkIndex") chunkIndex?: string
  ) {
    if (!file) {
      throw new BadRequestException("No audio file provided");
    }

    this.logger.debug(
      `Transcribing audio: size=${file.size}, sessionId=${sessionId}, chunkIndex=${chunkIndex}`
    );

    try {
      const result = await this.whisperService.transcribe(file.buffer, {
        sessionId: sessionId || undefined,
        chunkIndex: chunkIndex ? parseInt(chunkIndex, 10) : undefined,
      });

      return result;
    } catch (error) {
      this.logger.error("Transcription error:", error);
      throw error;
    }
  }

  @Post("session/:sessionId/finalize")
  async finalizeSession(@Param("sessionId") sessionId: string) {
    return this.whisperService.finalizeSession(sessionId);
  }
}
```

```typescript
// whisper.service.ts
import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { Readable } from "stream";

interface TranscriptionOptions {
  sessionId?: string;
  chunkIndex?: number;
}

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);

  private readonly client = new OpenAI({
    baseURL: "https://llm.onerouter.pro/v1",
    apiKey:
      process.env.ONEROUTER_API_KEY ||
      "sk-VUw8FKc1rBuVAuzl7g5oXT7Fo2hpL6WpdW38MgD5pSkQRVoc",
  });

  // Store session chunks in memory (use Redis for production)
  private sessionChunks = new Map<string, Map<number, string>>();

  async transcribe(audioBuffer: Buffer, options: TranscriptionOptions = {}) {
    try {
      this.logger.debug(
        `Transcribing audio chunk, size: ${audioBuffer.length} bytes`
      );

      // Convert buffer to file-like object for OpenAI
      const file = new File([audioBuffer], "audio.wav", { type: "audio/wav" });

      // Call OpenAI Whisper API
      const transcription = await this.client.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "fr", // Change to 'en' or auto-detect as needed
        response_format: "text",
      });

      const text =
        typeof transcription === "string" ? transcription : transcription.text;

      this.logger.debug(`Transcription result: "${text}"`);

      // Handle session management if provided
      if (options.sessionId && typeof options.chunkIndex === "number") {
        if (!this.sessionChunks.has(options.sessionId)) {
          this.sessionChunks.set(options.sessionId, new Map());
        }

        const chunks = this.sessionChunks.get(options.sessionId)!;
        chunks.set(options.chunkIndex, text);

        // Assemble session text from all chunks
        const sessionText = this.assembleSessionText(options.sessionId);

        return {
          text: text, // Current chunk
          sessionText: sessionText, // Full session so far
          chunkIndex: options.chunkIndex,
          sessionId: options.sessionId,
        };
      }

      return { text };
    } catch (error: any) {
      this.logger.error("Whisper transcription error:", {
        error: error?.message,
        response: error?.response?.data,
        stack: error?.stack,
      });
      throw error;
    }
  }

  async finalizeSession(sessionId: string) {
    const text = this.assembleSessionText(sessionId);
    // Clean up session data
    this.sessionChunks.delete(sessionId);
    return { text, sessionId };
  }

  private assembleSessionText(sessionId: string): string {
    const chunks = this.sessionChunks.get(sessionId);
    if (!chunks || chunks.size === 0) return "";

    return Array.from(chunks.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, text]) => text.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }
}
```

---

### Fix 2: Enhanced Task Parsing with DueDate and Status

Update your `TextGenerationService.generateTask()` prompt:

````typescript
async generateTask(prompt: string) {
  try {
    this.logger.debug(`Generating task from prompt: "${prompt}"`);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Analyze this user input and extract task information: "${prompt}"

Extract the following fields:

1. **TITLE**: Short task title (max 50 chars)

2. **DESCRIPTION**: Detailed description

3. **PRIORITY** (CRITICAL - Determine based on context):
   - URGENT: Health emergencies, safety issues, system crashes, "ASAP", "immediately", "critical", "emergency"
   - HIGH: Work deadlines (this week), important meetings, "important", "priority", "soon", bills due
   - MEDIUM: Regular tasks, routine shopping, general planning, no urgency indicators
   - LOW: "when possible", "sometime", "eventually", "optional", hobbies, entertainment

4. **DUE DATE** (Extract from temporal references):
   - Look for: "today", "tomorrow", "next week", "Friday", "in 3 days", "by EOD", etc.
   - Extract specific dates: "on December 15", "15/12/2025"
   - Calculate relative dates: "in 2 days", "next Monday"
   - Return ISO 8601 format: "YYYY-MM-DDTHH:mm:ss.000Z"
   - If NO date mentioned: return null

5. **STATUS** (Infer from context):
   - TODO: Default for new tasks, "need to", "should", "plan to"
   - IN_PROGRESS: "working on", "started", "currently", "in the middle of"
   - DONE: "finished", "completed", "done"
   - CANCELLED: "cancel", "cancelled", "nevermind"

EXAMPLES:

Input: "Call doctor tomorrow morning about chest pain"
Output: {
  "title": "Call doctor about chest pain",
  "description": "Contact doctor tomorrow morning regarding chest pain concern",
  "priority": "urgent",
  "dueDate": "2025-11-06T09:00:00.000Z",
  "status": "TODO"
}

Input: "Buy groceries when I have time"
Output: {
  "title": "Buy groceries",
  "description": "Purchase groceries when convenient",
  "priority": "low",
  "dueDate": null,
  "status": "TODO"
}

Input: "Submit report by Friday 5pm"
Output: {
  "title": "Submit report",
  "description": "Complete and submit report by Friday 5pm deadline",
  "priority": "high",
  "dueDate": "2025-11-08T17:00:00.000Z",
  "status": "TODO"
}

Input: "Working on presentation deck, need to finish by EOD"
Output: {
  "title": "Finish presentation deck",
  "description": "Complete presentation deck by end of day",
  "priority": "high",
  "dueDate": "2025-11-05T17:00:00.000Z",
  "status": "IN_PROGRESS"
}

NOW ANALYZE AND RETURN ONLY JSON (no markdown, no explanation):
{
  "title": "<task title>",
  "description": "<task description>",
  "priority": "<low|medium|high|urgent>",
  "dueDate": "<ISO date or null>",
  "status": "<TODO|IN_PROGRESS|DONE|CANCELLED>"
}`
        }
      ],
      temperature: 0.3
    });

    const content = response.choices[0].message?.content?.trim();
    this.logger.debug(`Raw AI response: "${content}"`);

    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Clean and parse JSON
    let cleanContent = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*/, '')
      .replace(/[^}]*$/, '')
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanContent);

    // Validate required fields
    if (!parsed.title || !parsed.description) {
      throw new Error('Missing required fields in AI response');
    }

    // Normalize priority
    parsed.priority = this.normalizePriority(parsed.priority);

    // Normalize status if missing
    if (!parsed.status) {
      parsed.status = 'TODO';
    }

    // Validate dueDate format if present
    if (parsed.dueDate && parsed.dueDate !== null) {
      try {
        const date = new Date(parsed.dueDate);
        if (isNaN(date.getTime())) {
          this.logger.warn(`Invalid dueDate: ${parsed.dueDate}, setting to null`);
          parsed.dueDate = null;
        } else {
          // Ensure ISO format
          parsed.dueDate = date.toISOString();
        }
      } catch (e) {
        this.logger.warn(`Error parsing dueDate: ${parsed.dueDate}`);
        parsed.dueDate = null;
      }
    }

    this.logger.debug(`Final parsed result:`, parsed);

    return parsed;
  } catch (error: any) {
    this.logger.error('Error in generateTask:', {
      error: error?.message || error,
      response: error?.response?.data,
      prompt: prompt,
    });

    // Fallback extraction
    const fallback = this.extractTaskFromPrompt(prompt);
    this.logger.warn('Using fallback extraction:', fallback);
    return fallback;
  }
}
````

---

### Fix 3: Enhanced Fallback Extraction

Update the fallback method to include dueDate and status:

```typescript
private extractTaskFromPrompt(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  // Priority detection
  let priority = 'medium';
  if (
    lowerPrompt.includes('asap') ||
    lowerPrompt.includes('urgent') ||
    lowerPrompt.includes('immediately') ||
    lowerPrompt.includes('critical') ||
    lowerPrompt.includes('emergency')
  ) {
    priority = 'urgent';
  } else if (
    lowerPrompt.includes('important') ||
    lowerPrompt.includes('priority') ||
    lowerPrompt.includes('soon')
  ) {
    priority = 'high';
  } else if (
    lowerPrompt.includes('when possible') ||
    lowerPrompt.includes('sometime') ||
    lowerPrompt.includes('eventually') ||
    lowerPrompt.includes('optional')
  ) {
    priority = 'low';
  }

  // Status detection
  let status = 'TODO';
  if (
    lowerPrompt.includes('working on') ||
    lowerPrompt.includes('started') ||
    lowerPrompt.includes('currently')
  ) {
    status = 'IN_PROGRESS';
  } else if (
    lowerPrompt.includes('finished') ||
    lowerPrompt.includes('completed') ||
    lowerPrompt.includes('done')
  ) {
    status = 'DONE';
  }

  // DueDate extraction (basic)
  let dueDate = null;
  const today = new Date();

  if (lowerPrompt.includes('today')) {
    today.setHours(17, 0, 0, 0); // Default to 5pm
    dueDate = today.toISOString();
  } else if (lowerPrompt.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    dueDate = tomorrow.toISOString();
  } else if (lowerPrompt.match(/in (\d+) days?/)) {
    const match = lowerPrompt.match(/in (\d+) days?/);
    const days = parseInt(match![1], 10);
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    future.setHours(17, 0, 0, 0);
    dueDate = future.toISOString();
  }

  // Extract title
  const title =
    prompt
      .replace(/tomorrow|today|at \d+[ap]m|asap|urgent|immediately/gi, '')
      .trim()
      .split(' ')
      .slice(0, 6)
      .join(' ')
      .replace(/[^\w\s]/g, '')
      .trim() || 'Task';

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description: `Task: ${prompt}`,
    priority: priority,
    dueDate: dueDate,
    status: status
  };
}
```

---

## 📝 Backend Implementation Checklist

### Required NestJS Modules:

1. **Install dependencies:**

```bash
npm install @nestjs/platform-express multer
npm install @types/multer --save-dev
```

2. **Create files:**

- `src/whisper/whisper.module.ts`
- `src/whisper/whisper.controller.ts`
- `src/whisper/whisper.service.ts`

3. **Register module in AppModule:**

```typescript
import { WhisperModule } from "./whisper/whisper.module";

@Module({
  imports: [
    // ... other modules
    WhisperModule,
  ],
})
export class AppModule {}
```

4. **Update TextGenerationService:**

- Add `dueDate` extraction to prompt
- Add `status` extraction to prompt
- Update fallback method
- Add validation for dates

---

## 🧪 Testing

### Test Whisper Endpoint:

```bash
curl -X POST http://localhost:3000/whisper/transcribe \
  -F "audio=@test-audio.wav" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Task Parsing:

```bash
curl -X POST http://localhost:3000/tasks/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"input":"Call doctor tomorrow at 3pm about test results ASAP"}'
```

Expected response:

```json
{
  "title": "Call doctor about test results",
  "description": "Contact doctor tomorrow at 3pm regarding test results - urgent",
  "priority": "urgent",
  "dueDate": "2025-11-06T15:00:00.000Z",
  "status": "TODO"
}
```

---

## ❓ Questions for You

1. **Whisper Endpoint Location**: Where is your `/tasks/parse` endpoint defined? I need to see the controller to ensure it's calling `TextGenerationService.generateTask()` correctly.

2. **Audio Format**: What audio format does your frontend send? (WAV, MP3, WebM?) This affects the Whisper API call.

3. **Session Storage**: For production, should I use Redis for session chunk storage instead of in-memory Map?

4. **Date Parsing**: Do you need multilingual date support (French dates like "demain", "lundi prochain")?

5. **Error Handling**: How should the backend handle Whisper API failures? Should it retry or fail immediately?

Let me know these details and I'll provide the exact implementation files!
