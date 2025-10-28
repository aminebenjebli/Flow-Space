'use client';

import React, { useRef, useState } from 'react';
import { api } from '@/lib/api/axios';
import { Button } from '@/components/ui/button';
import { Play, StopCircle, UploadCloud, CheckCircle } from 'lucide-react';

type TranscriptionCallback = (text: string, opts?: { replace?: boolean }) => void;

/* ---------- Helpers WAV / resample ---------- */
function writeString(view: DataView, offset: number, str: string) {
for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
for (let i = 0; i < input.length; i++, offset += 2) {
let s = Math.max(-1, Math.min(1, input[i]));
s = s < 0 ? s * 0x8000 : s * 0x7fff;
output.setInt16(offset, s, true);
}
}
function encodeWAV(samples: Float32Array, sampleRate: number) {
const buffer = new ArrayBuffer(44 + samples.length * 2);
const view = new DataView(buffer);
writeString(view, 0, 'RIFF');
view.setUint32(4, 36 + samples.length * 2, true);
writeString(view, 8, 'WAVE');
writeString(view, 12, 'fmt ');
view.setUint32(16, 16, true);
view.setUint16(20, 1, true);
view.setUint16(22, 1, true);
view.setUint32(24, sampleRate, true);
view.setUint32(28, sampleRate * 2, true);
view.setUint16(32, 2, true);
view.setUint16(34, 16, true);
writeString(view, 36, 'data');
view.setUint32(40, samples.length * 2, true);
floatTo16BitPCM(view, 44, samples);
return new Blob([view], { type: 'audio/wav' });
}
function mergeBuffers(buffers: Float32Array[], len: number) {
const result = new Float32Array(len);
let offset = 0;
for (const b of buffers) {
result.set(b, offset);
offset += b.length;
}
return result;
}
function downsampleBuffer(buffer: Float32Array, srcRate: number, dstRate: number) {
if (dstRate === srcRate) return buffer;
const ratio = srcRate / dstRate;
const newLength = Math.round(buffer.length / ratio);
const result = new Float32Array(newLength);
let offsetBuffer = 0;
for (let i = 0; i < newLength; i++) {
    const nextOffset = Math.round((i + 1) * ratio);
let acc = 0;
let count = 0;
for (let j = Math.round(offsetBuffer); j < Math.min(nextOffset, buffer.length); j++) {
acc += buffer[j];
count++;
}
result[i] = count ? acc / count : 0;
offsetBuffer = nextOffset;
}
return result;
}

/* ---------- Normalisation / util ---------- */
const normalizeText = (s: string) => {
if (!s) return '';
// unify CRLF, collapse multiple blank lines, trim edges and remove double spaces
return s.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
};
const assembleChunks = (map: Map<number, string>) => {
if (!map || map.size === 0) return '';
return Array.from(map.entries())
.sort((a, b) => Number(a[0]) - Number(b[0]))
.map(([_, t]) => (t || '').trim())
.filter(Boolean)
.join('\n')
.trim();
};

/* ---------- Component ---------- */
export default function WhisperTester({
onTranscription,
compact = true,
autoInsert = 'append',
}: {
onTranscription?: TranscriptionCallback;
compact?: boolean;
autoInsert?: 'append' | 'replace' | false;
}) {
const [transcription, setTranscription] = useState<string | null>(null);
const transcriptionRef = useRef<string | null>(null);
const updateTranscription = (valOrFn: string | null | ((prev: string | null) => string | null)) => {
const newVal = typeof valOrFn === 'function' ? (valOrFn as any)(transcriptionRef.current) : valOrFn;
transcriptionRef.current = newVal;
setTranscription(newVal);
};
const transcriptAllRef = useRef<string>('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [isRecording, setIsRecording] = useState(false);
const [lastInserted, setLastInserted] = useState<{ text: string; at: number } | null>(null);

const audioContextRef = useRef<AudioContext | null>(null);
const processorRef = useRef<any | null>(null);
const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
const streamRef = useRef<MediaStream | null>(null);
const buffersRef = useRef<Float32Array[]>([]);
const chunkIntervalRef = useRef<number | null>(null);
const chunkIndexRef = useRef<number>(0);
const sessionIdRef = useRef<string | null>(null);
const concurrentUploadsRef = useRef<number>(0);
const lastServerSnapshotRef = useRef<string | null>(null);
const maxConcurrentUploads = 3;

// client-side chunk store for ordered assembly
const sessionChunksRef = useRef<Map<number, string>>(new Map());

// expose for debug (optional) - remove for production
// @ts-ignore
if (typeof window !== 'undefined') window.__sessionChunks = sessionChunksRef.current;

const extractText = (res: any) => {
if (!res) return null;
const payload = res?.data ?? res;
if (typeof payload === 'string') return payload;
if (payload?.text) return payload.text;
if (payload?.sessionText) return payload.sessionText;
return JSON.stringify(payload);
};

const appendToLocalTranscript = (chunkText: string) => {
if (!chunkText) return;
const cur = transcriptAllRef.current || '';
if (!cur) {
transcriptAllRef.current = chunkText;
} else if (cur.endsWith(chunkText)) {
// avoid duplicate exact suffix
} else {
transcriptAllRef.current = cur + '\n' + chunkText;
}
updateTranscription(transcriptAllRef.current);
};
const uploadBlob = async (blob: Blob, opts?: { sessionId?: string; chunkIndex?: number }) => {
setLoading(true);
setError(null);
try {
const fd = new FormData();
fd.append('audio', blob, `upload-${Date.now()}.wav`);
if (opts?.sessionId) fd.append('sessionId', opts.sessionId);
if (typeof opts?.chunkIndex === 'number') fd.append('chunkIndex', String(opts.chunkIndex));
  const res = await api.post('/whisper/transcribe', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  const payload = res?.data ?? res;
  console.debug('[whisper] server payload', payload, 'chunkIndex=', opts?.chunkIndex);

  const chunkTextRaw = payload?.text ?? null;
  const sessionTextRaw = payload?.sessionText ?? null;
  const chunkText = normalizeText(String(chunkTextRaw ?? '')).trim();
  const sessionText = normalizeText(String(sessionTextRaw ?? '')).trim();

  // store only non-empty chunk texts
  if (typeof opts?.chunkIndex === 'number') {
    if (chunkText) {
      sessionChunksRef.current.set(opts.chunkIndex, chunkText);
    } else {
      // do not overwrite with empty string; keep previous if any
    }
  } else if (chunkText) {
    const nextIdx = chunkIndexRef.current++;
    sessionChunksRef.current.set(nextIdx, chunkText);
  }

  const assembled = normalizeText(assembleChunks(sessionChunksRef.current));

  // prefer server snapshot only if clearly more complete (margin to avoid tiny diffs)
  let display = assembled;
  if (sessionText && sessionText.length > (assembled?.length ?? 0) + 5) {
    display = sessionText;
  }

  transcriptAllRef.current = display;
  updateTranscription(display);

  // autoInsert callback: send assembled display when replacing, otherwise send the chunk
  if (autoInsert && onTranscription) {
    try {
      const replace = autoInsert === 'replace';
      const payloadForInsert = replace ? (display || '') : (chunkText || '');
      // Only call callback when there's something meaningful to insert
      if (payloadForInsert) {
        onTranscription(payloadForInsert, { replace });
        setLastInserted({ text: payloadForInsert, at: Date.now() });
      }
    } catch (e) {
      console.warn('autoInsert callback error', e);
    }
  }

  console.debug('[whisper] sessionChunks size=', sessionChunksRef.current.size, 'assembledLen=', assembled.length, 'displayLen=', display.length);

  return payload;
} catch (e: any) {
  console.error('[whisper] uploadBlob error', e);
  setError(e?.response?.data?.message || e?.message || String(e));
  throw e;
} finally {
  setLoading(false);
}
};

const flushBufferAndUpload = async () => {
const buffers = buffersRef.current;
if (!buffers.length) return;
const len = buffers.reduce((s, b) => s + b.length, 0);
const merged = mergeBuffers(buffers, len);
buffersRef.current = [];
const audioCtx = audioContextRef.current!;
const srcSampleRate = audioCtx.sampleRate;
const down = downsampleBuffer(merged, srcSampleRate, 16000);
const wav = encodeWAV(down, 16000);

while (concurrentUploadsRef.current >= maxConcurrentUploads) await new Promise((r) => setTimeout(r, 200));

// RESERVE chunk index BEFORE starting the upload to avoid races
const currentChunk = chunkIndexRef.current++;
console.debug('[whisper] sending chunk', { sessionId: sessionIdRef.current, chunkIndex: currentChunk, ts: Date.now() });

concurrentUploadsRef.current++;
try {
  await uploadBlob(wav, { sessionId: sessionIdRef.current || undefined, chunkIndex: currentChunk });
} catch (e) {
  console.warn('upload failed', e);
} finally {
  concurrentUploadsRef.current = Math.max(0, concurrentUploadsRef.current - 1);
}
};

const startRecording = async () => {
setError(null);
updateTranscription(null);
transcriptAllRef.current = '';
try {
// reset client chunk store for new session
sessionChunksRef.current.clear();
lastServerSnapshotRef.current = null;
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
audioContextRef.current = audioCtx;
streamRef.current = stream;
const source = audioCtx.createMediaStreamSource(stream);
sourceRef.current = source;
buffersRef.current = [];
  // Prefer AudioWorkletNode when available
  if (audioCtx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
    try {
      await audioCtx.audioWorklet.addModule('/worklets/recorder-processor.js');
      const node = new AudioWorkletNode(audioCtx, 'recorder-processor');
      processorRef.current = node;
      node.port.onmessage = (ev) => {
        const data = ev.data as Float32Array;
        buffersRef.current.push(new Float32Array(data));
      };
      source.connect(node);
    } catch (e) {
      // fallback ScriptProcessor
      const bufferSize = 4096;
      const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const input = e.inputBuffer.getChannelData(0);
        buffersRef.current.push(new Float32Array(input));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);
    }
  } else {
    const bufferSize = 4096;
    const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    processorRef.current = processor;
    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      buffersRef.current.push(new Float32Array(input));
    };
    source.connect(processor);
    processor.connect(audioCtx.destination);
  }

  sessionIdRef.current = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  chunkIndexRef.current = 0;

  const timesliceMs = 3000;
  chunkIntervalRef.current = window.setInterval(flushBufferAndUpload, timesliceMs);

  setIsRecording(true);
} catch (e: any) {
  setError(e?.message || "Impossible d'accéder au micro");
}
};

const stopRecording = async () => {
try {
if (chunkIntervalRef.current) {
clearInterval(chunkIntervalRef.current);
chunkIntervalRef.current = null;
}
await flushBufferAndUpload();
  // Ask backend for final aggregation (optional)
  try {
    if (sessionIdRef.current) {
      const res = await api.post(`/whisper/session/${sessionIdRef.current}/finalize`);
      if (res?.data?.text) {
        transcriptAllRef.current = res.data.text;
        updateTranscription(res.data.text);
      }
    }
  } catch (e) {
    console.warn('session finalize failed', e);
  }

  try {
    const proc = processorRef.current;
    if (proc) {
      if (proc instanceof AudioWorkletNode || proc.port) {
        try {
          proc.port.onmessage = null;
        } catch {}
        try {
          (proc as any).disconnect?.();
        } catch {}
      } else {
        try {
          proc.disconnect();
        } catch {}
      }
    }
  } catch (e) {}

  sourceRef.current?.disconnect();
  processorRef.current = null;
  sourceRef.current = null;
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;
  try { await audioContextRef.current?.close(); } catch {}
  audioContextRef.current = null;
  setIsRecording(false);
} catch (e) {
  setError("Échec de l'arrêt de l'enregistrement");
}
};

const onFileChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
const f = ev.target.files?.[0];
if (!f) return;
sessionChunksRef.current.clear();
sessionIdRef.current = null;
chunkIndexRef.current = 0;
await uploadBlob(f);
};

return (
<div className={`flow-card ${compact ? 'p-3' : 'p-4 max-w-2xl'} flow-border`}>
<div className="flex items-center justify-between">
<div className="flex items-center gap-2">
<Button type="button" size="sm" onClick={startRecording} disabled={isRecording} className="flex items-center gap-2">
<Play className="h-4 w-4" />
<span className="text-sm">{isRecording ? 'Enregistrement' : 'Démarrer'}</span>
</Button>
<Button type="button" size="sm" variant="outline" onClick={stopRecording} disabled={!isRecording} className="flex items-center gap-2">
<StopCircle className="h-4 w-4" />
<span className="text-sm">Arrêter</span>
</Button>
      <label className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2">
        <input className="hidden" type="file" accept="audio/*" onChange={onFileChange} />
        <UploadCloud className="h-4 w-4" />
        <span>Importer</span>
      </label>
    </div>

    <div className="flex items-center gap-3">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Transcription...</span>
          </>
        ) : error ? (
          <span className="text-destructive">Erreur</span>
        ) : (
          <span className="text-sm text-muted-foreground">{isRecording ? 'Enregistrement' : 'Prêt'}</span>
        )}
      </div>

      {lastInserted && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-primary" />
          <div className="max-w-[220px] truncate">inséré • {new Date(lastInserted.at).toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  </div>

  {/* <div className={`mt-3 text-sm whitespace-pre-wrap break-words text-muted-foreground ${compact ? 'max-h-20 overflow-auto' : ''}`}>
    {transcription ?? '— aucune transcription —'}
  </div> */}
</div>
);
}