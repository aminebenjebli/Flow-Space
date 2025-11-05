# Whisper Backend Analysis & Fixes

## ✅ Good News: Whisper Endpoint Exists!

Your backend **already has** the `/whisper/transcribe` endpoint. The frontend is calling it correctly.

## 🔍 Issues Identified

### Issue #1: Language Parameter Not Passed from Frontend

**Current Frontend Code** (`whisper-tester.tsx`):

```typescript
formData.append("sessionId", sessionId);
formData.append("chunkIndex", chunkIndex.toString());
// ❌ NO language parameter sent!
```

**Backend Expects** (`whisper.controller.ts`):

```typescript
language: { type: 'string', description: "Optional language code (e.g. en, fr, es)..." }
```

**Fix Required**: Frontend should send language parameter.

---

### Issue #2: Parse Endpoint Missing Language Support

**Current Parse Code** (from your snippet):

```typescript
@Post('parse')
@ApiBody({ type: ParseTaskDto })
async parseTask(@Body() body: ParseTaskDto) {
    const { input } = body;

    // ❌ Language from body.lang is IGNORED
    const generated = await this.textGenService.generateTask(input);

    const parsedDate = this.taskService.parseUserText(input).dueDate;

    return {
        ...generated,
        dueDate: parsedDate ?? null,
    };
}
```

**Expected Body Format**:

```json
{
  "input": "Baby fever - call doctor urgent",
  "lang": "en"
}
```

**Problem**: The `lang` parameter is sent but **not used** by `textGenService.generateTask()`.

---

### Issue #3: Missing Status Extraction

**Current**: Backend generates `{title, description, priority, dueDate}`

**Frontend Expects**: `{title, description, priority, dueDate, status}`

**Missing**: Status extraction from keywords like "urgent", "done", "in progress", etc.

---

### Issue #4: FFmpeg/Python Whisper Path Issues

**Current Whisper Service**:

```typescript
const ff = process.env.FFMPEG_BINARY || "/opt/homebrew/bin/ffmpeg";
const pythonCmd = process.env.WHISPER_PYTHON_CMD || "python";
```

**Potential Issues**:

- `/opt/homebrew/bin/ffmpeg` might not exist on your system
- `python` might not have whisper installed
- PATH issues causing "Failed on local" error

---

## 🛠️ Complete Fixes

### Fix #1: Update Frontend to Send Language

**File**: `/src/components/speechtotext/whisper-tester.tsx`

**Find** (around line 185-190):

```typescript
formData.append("audio", audioBlob);
formData.append("sessionId", sessionId);
formData.append("chunkIndex", chunkIndex.toString());
```

**Replace with**:

```typescript
formData.append("audio", audioBlob);
formData.append("sessionId", sessionId);
formData.append("chunkIndex", chunkIndex.toString());
formData.append("language", language || "auto"); // ✅ Add language parameter
```

---

### Fix #2: Update Parse Endpoint to Use Language

**Backend Controller** (your parse endpoint):

**Current**:

```typescript
@Post('parse')
@ApiBody({ type: ParseTaskDto })
async parseTask(@Body() body: ParseTaskDto) {
    const { input } = body;

    // ❌ Language ignored
    const generated = await this.textGenService.generateTask(input);

    const parsedDate = this.taskService.parseUserText(input).dueDate;

    return {
        ...generated,
        dueDate: parsedDate ?? null,
    };
}
```

**Updated**:

```typescript
@Post('parse')
@ApiBody({ type: ParseTaskDto })
async parseTask(@Body() body: ParseTaskDto) {
    const { input, lang } = body; // ✅ Extract lang

    // ✅ Pass language to generateTask
    const generated = await this.textGenService.generateTask(input, lang);

    const parsedDate = this.taskService.parseUserText(input).dueDate;

    return {
        ...generated,
        dueDate: parsedDate ?? null,
    };
}
```

---

### Fix #3: Update TextGenerationService to Support Language & Status

**Update `generateTask()` method signature**:

````typescript
async generateTask(input: string, language?: string): Promise<{
    title: string;
    description?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
}> {
    // Detect language if not provided
    const lang = language || this.detectLanguage(input);

    const isEnglish = lang === 'en' || lang === 'auto';

    // Enhanced prompt with status extraction
    const systemPrompt = isEnglish
        ? `You are a task extraction assistant. Extract task details from user input and return ONLY valid JSON.

           Extract these fields:
           - title: Short task title (max 100 chars)
           - description: Detailed description (optional)
           - priority: One of LOW, MEDIUM, HIGH, URGENT
           - status: One of TODO, IN_PROGRESS, DONE, CANCELLED (default TODO if not mentioned)

           Priority detection keywords:
           - LOW: "low", "minor", "whenever", "someday"
           - MEDIUM: "normal", "regular", "moderate" (default)
           - HIGH: "important", "high", "priority", "soon"
           - URGENT: "urgent", "asap", "immediately", "emergency", "critical"

           Status detection keywords:
           - TODO: "need to", "should", "plan to", "upcoming" (default)
           - IN_PROGRESS: "working on", "currently", "started", "in progress"
           - DONE: "finished", "completed", "done"
           - CANCELLED: "cancelled", "no longer needed", "dropped"

           Return ONLY this JSON structure:
           {"title": "...", "description": "...", "priority": "...", "status": "..."}`

        : `Tu es un assistant d'extraction de tâches. Extrais les détails de la tâche et retourne UNIQUEMENT du JSON valide.

           Extrais ces champs:
           - title: Titre court de la tâche (max 100 caractères)
           - description: Description détaillée (optionnel)
           - priority: Une valeur parmi LOW, MEDIUM, HIGH, URGENT
           - status: Une valeur parmi TODO, IN_PROGRESS, DONE, CANCELLED (défaut TODO)

           Mots-clés de priorité:
           - LOW: "basse", "mineur", "quand possible"
           - MEDIUM: "normale", "régulière", "modérée" (défaut)
           - HIGH: "importante", "haute", "prioritaire", "bientôt"
           - URGENT: "urgent", "immédiat", "urgence", "critique"

           Mots-clés de statut:
           - TODO: "à faire", "doit", "prévu", "prochain" (défaut)
           - IN_PROGRESS: "en cours", "actuellement", "commencé"
           - DONE: "terminé", "fini", "fait"
           - CANCELLED: "annulé", "abandonné", "plus nécessaire"

           Retourne UNIQUEMENT cette structure JSON:
           {"title": "...", "description": "...", "priority": "...", "status": "..."}`;

    try {
        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input }
            ],
            temperature: 0.3,
            max_tokens: 300,
        });

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) throw new Error('Empty AI response');

        this.logger.log(`AI raw response: ${content}`);

        // Clean and parse JSON
        let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        if (cleaned.startsWith('`')) cleaned = cleaned.slice(1);
        if (cleaned.endsWith('`')) cleaned = cleaned.slice(0, -1);

        const parsed = JSON.parse(cleaned);

        // Normalize priority
        const priority = this.normalizePriority(parsed.priority || parsed.priorite);

        // Normalize status
        const status = this.normalizeStatus(parsed.status || parsed.statut);

        return {
            title: parsed.title || parsed.titre || 'Untitled Task',
            description: parsed.description || undefined,
            priority,
            status,
        };

    } catch (error) {
        this.logger.error('AI generation failed, using fallback extraction', error);

        // Fallback extraction
        return this.fallbackExtraction(input, lang);
    }
}

// Add new normalizeStatus method
private normalizeStatus(status: any): 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' {
    if (!status || typeof status !== 'string') return 'TODO';

    const s = status.toLowerCase().trim();

    // Direct matches
    if (s === 'todo' || s === 'à faire') return 'TODO';
    if (s === 'in_progress' || s === 'in-progress' || s === 'en cours') return 'IN_PROGRESS';
    if (s === 'done' || s === 'terminé' || s === 'fait') return 'DONE';
    if (s === 'cancelled' || s === 'canceled' || s === 'annulé') return 'CANCELLED';

    // Keyword detection
    if (s.includes('progress') || s.includes('cours') || s.includes('started') || s.includes('commencé')) {
        return 'IN_PROGRESS';
    }
    if (s.includes('done') || s.includes('finish') || s.includes('terminé') || s.includes('complet')) {
        return 'DONE';
    }
    if (s.includes('cancel') || s.includes('annul') || s.includes('dropped')) {
        return 'CANCELLED';
    }

    return 'TODO'; // Default
}

// Update fallbackExtraction to include status
private fallbackExtraction(input: string, lang: string): {
    title: string;
    description?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
} {
    const inputLower = input.toLowerCase();

    // Extract title (first sentence or first 100 chars)
    let title = input.split(/[.!?]/)[0].trim();
    if (title.length > 100) title = title.substring(0, 97) + '...';
    if (!title) title = 'Untitled Task';

    // Detect priority from keywords
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
    if (inputLower.includes('urgent') || inputLower.includes('asap') ||
        inputLower.includes('emergency') || inputLower.includes('critique')) {
        priority = 'URGENT';
    } else if (inputLower.includes('important') || inputLower.includes('high') ||
               inputLower.includes('priorit') || inputLower.includes('soon')) {
        priority = 'HIGH';
    } else if (inputLower.includes('low') || inputLower.includes('minor') ||
               inputLower.includes('basse') || inputLower.includes('mineur')) {
        priority = 'LOW';
    }

    // Detect status from keywords
    let status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' = 'TODO';
    if (inputLower.includes('working on') || inputLower.includes('in progress') ||
        inputLower.includes('en cours') || inputLower.includes('started')) {
        status = 'IN_PROGRESS';
    } else if (inputLower.includes('done') || inputLower.includes('finished') ||
               inputLower.includes('terminé') || inputLower.includes('completed')) {
        status = 'DONE';
    } else if (inputLower.includes('cancel') || inputLower.includes('annul') ||
               inputLower.includes('dropped')) {
        status = 'CANCELLED';
    }

    return {
        title,
        description: input.length > title.length ? input : undefined,
        priority,
        status,
    };
}

// Add language detection helper
private detectLanguage(input: string): string {
    const frenchWords = ['le', 'la', 'un', 'une', 'et', 'ou', 'pour', 'avec', 'dans'];
    const words = input.toLowerCase().split(/\s+/);
    const frenchCount = words.filter(w => frenchWords.includes(w)).length;

    return frenchCount > 2 ? 'fr' : 'en';
}
````

---

### Fix #4: Fix Whisper Local Dependencies

**Check Your System**:

1. **Verify FFmpeg location**:

   ```bash
   which ffmpeg
   ```

2. **Verify Python Whisper**:
   ```bash
   python3 -m whisper --help
   # or
   python -m whisper --help
   ```

**Update Backend Environment Variables**:

Create/update `.env` file in your backend:

```bash
# If ffmpeg is at a different location (use output from 'which ffmpeg')
FFMPEG_BINARY=/usr/local/bin/ffmpeg

# If you need python3 instead of python
WHISPER_PYTHON_CMD=python3

# Whisper model (small is good balance of speed/accuracy)
WHISPER_MODEL=small

# Optional: default language
WHISPER_LANGUAGE=auto
```

**Common Issues & Fixes**:

| Error                             | Cause                 | Fix                               |
| --------------------------------- | --------------------- | --------------------------------- |
| "Failed on local"                 | FFmpeg not found      | Set `FFMPEG_BINARY` env var       |
| "python -m whisper not available" | Whisper not installed | Run `pip install openai-whisper`  |
| "ffmpeg invalid input"            | Corrupted audio chunk | Frontend issue - check recording  |
| "spawn error"                     | Wrong Python command  | Use `python3` instead of `python` |

---

### Fix #5: Update ParseTaskDto

**Add language field to DTO**:

```typescript
export class ParseTaskDto {
  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsOptional()
  lang?: string; // ✅ Add language field
}
```

---

## 📋 Implementation Checklist

### Frontend Changes:

- [ ] Update `whisper-tester.tsx` to send `language` parameter
- [ ] Verify language is passed correctly in FormData

### Backend Changes:

- [ ] Update `ParseTaskDto` to include `lang` field
- [ ] Update parse controller to extract and use `lang`
- [ ] Update `TextGenerationService.generateTask()` to accept `language` parameter
- [ ] Add `normalizeStatus()` method
- [ ] Add `detectLanguage()` method
- [ ] Update `fallbackExtraction()` to include status
- [ ] Update AI prompts to extract status field
- [ ] Set environment variables for FFmpeg and Python paths

### Testing:

- [ ] Test Whisper transcription in English
- [ ] Test Whisper transcription in French
- [ ] Test parse with English input
- [ ] Test parse with French input
- [ ] Test status extraction ("urgent", "done", "in progress")
- [ ] Test priority extraction
- [ ] Test complete flow: voice → transcription → parse → task creation

---

## 🐛 Debugging "Failed on local" Error

If you're still getting "Failed on local" error, add more logging:

**In `whisper.service.ts`**, update the catch block in `transcribeBufferLocal()`:

```typescript
} catch (err) {
    this.logger.error('local transcription failed', err as any);
    this.logger.error('FFmpeg path:', process.env.FFMPEG_BINARY || '/opt/homebrew/bin/ffmpeg');
    this.logger.error('Python cmd:', process.env.WHISPER_PYTHON_CMD || 'python');

    // Return more detailed error
    return `transcription error: ${err?.message || 'unknown error'}`;
}
```

**Check logs** to see which command is failing.

---

## 🎯 Expected Final Behavior

1. **Voice Recording**:

   - User clicks record in WhisperTester
   - Audio chunks sent to `/whisper/transcribe` with `language: "auto"`
   - Backend transcribes each chunk using local Whisper
   - Transcription appears in task form

2. **Text Parsing**:

   - User clicks "Parse" button with text: "Baby fever - call doctor urgent"
   - Frontend sends: `{input: "...", lang: "en"}`
   - Backend AI extracts:
     ```json
     {
       "title": "Call doctor about baby fever",
       "description": "Baby fever - call doctor urgent",
       "priority": "URGENT",
       "status": "TODO"
     }
     ```
   - Frontend receives and populates form

3. **Task Creation**:
   - Form has: title, description, priority, dueDate, status
   - User clicks "Create Task"
   - Task saved with all fields

---

## 🔧 Quick Fix Priority

**If you want to fix the most critical issue first:**

1. **Fix Whisper "Failed on local"**: Set environment variables for FFmpeg/Python paths
2. **Fix Status Extraction**: Update TextGenerationService to return status field
3. **Fix Language Support**: Pass language from frontend through to AI

**Start with #1** - that's likely why Whisper is failing!

---

## ❓ Questions for You

1. **What OS are you running the backend on?** (macOS, Linux, Windows?)

   - This affects FFmpeg/Python paths

2. **Run these commands and share output**:

   ```bash
   which ffmpeg
   which python3
   python3 -m whisper --help
   ```

3. **Do you want to support both English and French?**

   - If yes, we need to enhance language detection
   - If English only, we can simplify

4. **What error do you see in backend logs** when Whisper fails?
   - Look for logs from WhisperService

---

Let me know the answers and I'll provide the exact files ready to use!
