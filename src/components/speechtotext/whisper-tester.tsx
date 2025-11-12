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
async function downsampleBuffer(buffer: Float32Array, srcRate: number, dstRate: number) {
  if (dstRate === srcRate) return buffer;

  // Prefer high-quality resampling using OfflineAudioContext when available
  if (typeof OfflineAudioContext !== 'undefined') {
    try {
      const ratio = dstRate / srcRate;
      const newLength = Math.ceil(buffer.length * ratio);
      const offlineCtx = new OfflineAudioContext(1, newLength, dstRate);
  const audioBuffer = offlineCtx.createBuffer(1, buffer.length, srcRate);
  // use any-cast to avoid strict ArrayBuffer/SharedArrayBuffer typing issues across environments
  (audioBuffer as any).copyToChannel(buffer, 0, 0);
      const src = offlineCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(offlineCtx.destination);
      src.start(0);
      const rendered = await offlineCtx.startRendering();
      const out = rendered.getChannelData(0);
      return new Float32Array(out);
    } catch (e) {
      console.warn('[whisper] OfflineAudioContext resample failed, falling back', e);
      // fall through to naive implementation
    }
  }

  // Fallback: simple averaging resampler (less quality)
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

// Trim duplicate prefix if prev chunk ends with same text that new chunk starts with
function trimDuplicatePrefix(prev: string | null, curr: string) {
  if (!prev || !curr) return curr;
  const a = normalizeText(prev).toLowerCase();
  const b = normalizeText(curr).toLowerCase();
  const maxCheck = Math.min(200, a.length, b.length);
  for (let i = maxCheck; i >= 1; i--) {
    if (a.endsWith(b.substring(0, i))) {
      return curr.substring(i).trim();
    }
  }
  return curr;
}

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
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<any | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const buffersRef = useRef<Float32Array[]>([]);
  const chunkIntervalRef = useRef<number | null>(null);
  const sessionPollIntervalRef = useRef<number | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const concurrentUploadsRef = useRef<number>(0);
  const lastServerSnapshotRef = useRef<string | null>(null);
  const maxConcurrentUploads = 4;

  // client-side chunk store for ordered assembly
  const sessionChunksRef = useRef<Map<number, string>>(new Map());
  const lastChunkTextRef = useRef<string>('');
  const lastTailRef = useRef<Float32Array | null>(null);

  // session timing tracking for timestamps
  const sessionStartRef = useRef<number | null>(null); // ms
  const sessionSamplesSentRef = useRef<number>(0); // samples at 16000 Hz

  // provisional badge state: true while quick result is shown and refinement not yet applied
  const [isProvisional, setIsProvisional] = useState<boolean>(false);

  // expose for debug (optional)
  // @ts-ignore
  if (typeof window !== 'undefined') window.__sessionChunks = sessionChunksRef.current;

  // Format text for display: single-line, collapse spaces
  const formatForDisplay = (s: string) => {
    if (!s) return '';
    return normalizeText(s).replace(/\n+/g, ' ').replace(/ {2,}/g, ' ').trim();
  };

  const uploadBlob = async (blob: Blob, opts?: { sessionId?: string; chunkIndex?: number; startTime?: number; endTime?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('audio', blob, `upload-${Date.now()}.wav`);
      if (opts?.sessionId) fd.append('sessionId', opts.sessionId);
      if (typeof opts?.chunkIndex === 'number') fd.append('chunkIndex', String(opts.chunkIndex));
      // Ajout des timestamps (en secondes)
      if (typeof opts?.startTime === 'number') fd.append('startTime', String(opts.startTime));
      if (typeof opts?.endTime === 'number') fd.append('endTime', String(opts.endTime));
      if (selectedLanguage && selectedLanguage !== 'auto') fd.append('language', selectedLanguage);
      const res = await api.post('/whisper/transcribe', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });

      const payload = res?.data ?? res;
      console.debug('[whisper] server payload', payload, 'chunkIndex=', opts?.chunkIndex);

      const chunkTextRaw = payload?.text ?? null;
      const sessionTextRaw = payload?.sessionText ?? null;
      let chunkText = normalizeText(String(chunkTextRaw ?? '')).trim();
      const sessionText = normalizeText(String(sessionTextRaw ?? '')).trim();

      // Decide provisional status:
      // - If server indicates queuedBackground (reprocessing in background) -> provisional true
      // - If server returns sessionText (assembled/refined) longer than client assembled -> provisional false
      if (payload?.queuedBackground) {
        setIsProvisional(true);
      }

      // store only non-empty chunk texts, with dedup
      if (typeof opts?.chunkIndex === 'number') {
        if (chunkText) {
          const deduped = trimDuplicatePrefix(lastChunkTextRef.current || null, chunkText);
          sessionChunksRef.current.set(opts.chunkIndex, deduped);
          lastChunkTextRef.current = chunkText;
        }
      } else if (chunkText) {
        const nextIdx = chunkIndexRef.current++;
        sessionChunksRef.current.set(nextIdx, chunkText);
        lastChunkTextRef.current = chunkText;
      }

      // assemble client-side
      const assembled = normalizeText(assembleChunks(sessionChunksRef.current));

      // Immediate display priority:
      // 1. sessionText (server-side session snapshot)
      // 2. assembled (client-side ordered chunks)
      // 3. chunkText (this chunk's quick result)
      let display = '';
      if (sessionText) {
        display = sessionText;
        // server snapshot present => refinement likely applied; not provisional
        setIsProvisional(false);
      } else if (assembled) {
        display = assembled;
        // if server signaled queuedBackground earlier, keep provisional true for now
      } else if (chunkText) {
        display = chunkText;
        // quick chunk result with no server snapshot -> provisional true
        if (!payload?.sessionText) setIsProvisional(!!payload?.queuedBackground || true);
      }

      if (display) {
        transcriptAllRef.current = display;
        updateTranscription(formatForDisplay(display));
      }

      // autoInsert callback: send assembled display when replacing, otherwise send the chunk
      if (autoInsert && onTranscription) {
        try {
          const replace = autoInsert === 'replace';
          const payloadForInsert = replace ? (display || '') : (chunkText || '');
          if (payloadForInsert) {
            onTranscription(payloadForInsert, { replace });
            setLastInserted({ text: payloadForInsert, at: Date.now() });
          }
        } catch (e) {
          console.warn('autoInsert callback error', e);
        }
      }

      return payload;
    } catch (e: any) {
      console.error('[whisper] uploadBlob error', e);
      let errorMsg = e?.response?.data?.message || e?.message || String(e);
      if (errorMsg.includes('timeout')) {
        console.warn('[whisper] Timeout but transcription may still be processing');
        return null;
      }
      setError(errorMsg);
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
    const srcSampleRate = audioCtx.sampleRate || 48000;
  const down = await downsampleBuffer(merged, srcSampleRate, 16000);

    // compute timestamps relative to session start (in seconds)
    if (!sessionStartRef.current) sessionStartRef.current = Date.now();
    // start = samples already sent / 16000
    const startSamples = sessionSamplesSentRef.current;
    const endSamples = startSamples + down.length;
    const startTimeSec = startSamples / 16000;
    const endTimeSec = endSamples / 16000;
    // increment samples sent (we count the downsampled samples)
    sessionSamplesSentRef.current = endSamples;

  // overlap handling: prepend last tail (overlap) to current downsampled chunk
  const overlapSec = 0.8; // 800ms overlap for border words (slightly larger chunks)
    const overlapSamples = Math.floor(16000 * overlapSec);
    let combined: Float32Array;
    if (lastTailRef.current && lastTailRef.current.length > 0) {
      combined = new Float32Array(lastTailRef.current.length + down.length);
      combined.set(lastTailRef.current, 0);
      combined.set(down, lastTailRef.current.length);
    } else {
      combined = down;
    }

    // update lastTailRef to be last <overlapSamples> of current down (for next chunk)
    if (down.length <= overlapSamples) {
      lastTailRef.current = down;
    } else {
      lastTailRef.current = down.subarray(down.length - overlapSamples);
    }

    const wav = encodeWAV(combined, 16000);

    // throttle concurrency
    while (concurrentUploadsRef.current >= maxConcurrentUploads) await new Promise((r) => setTimeout(r, 150));

    const currentChunk = chunkIndexRef.current++;
    console.debug('[whisper] sending chunk', { sessionId: sessionIdRef.current, chunkIndex: currentChunk, ts: Date.now(), startTimeSec, endTimeSec });

    concurrentUploadsRef.current++;
    try {
      const payload = await uploadBlob(wav, { sessionId: sessionIdRef.current || undefined, chunkIndex: currentChunk, startTime: startTimeSec, endTime: endTimeSec });

      // After successful upload, request session snapshot immediately to get richer server-side text
      try {
        // If the server indicated there's a background job, poll more aggressively in short bursts:
        if (payload?.queuedBackground) {
          // short retry loop to give background reprocess time to finish (adjust tries/interval as needed)
          const maxTries = 8;
          for (let i = 0; i < maxTries; i++) {
            await new Promise((r) => setTimeout(r, 1000));
            await pollSession();
            // stop early if server snapshot improved
            const currLen = (lastServerSnapshotRef.current || '').length;
            if (currLen > 0) break;
          }
        } else {
          await pollSession();
        }
      } catch (e) {
        console.warn('[whisper] pollSession after upload failed', e);
      }
    } catch (e: any) {
      if (e?.message?.includes('timeout')) {
        console.warn('[whisper] Upload timeout - chunk may still be processing on backend');
      } else {
        console.warn('upload failed', e);
      }
    } finally {
      concurrentUploadsRef.current = Math.max(0, concurrentUploadsRef.current - 1);
    }
  };

  // Poll server session endpoint for richer session-level transcription and update UI when it improves
  const pollSession = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const res = await api.get(`/whisper/session/${sid}`, { timeout: 10000 });
      const payload = res?.data ?? res;
      const serverText = normalizeText(String(payload?.text ?? payload?.sessionText ?? '')).trim();
      if (!serverText) return;
      const prev = lastServerSnapshotRef.current || '';
      if (serverText.length > prev.length + 2) {
        lastServerSnapshotRef.current = serverText;
        transcriptAllRef.current = serverText;
        updateTranscription(formatForDisplay(serverText));
        // server provided better text -> no longer provisional
        setIsProvisional(false);
        if (onTranscription) {
          try {
            onTranscription(serverText, { replace: true });
            setLastInserted({ text: serverText, at: Date.now() });
          } catch (e) {
            console.warn('onTranscription error while polling session', e);
          }
        }
      }
    } catch (e) {
      // ignore polling errors silently
    }
  };

  const startRecording = async () => {
    setError(null);
    updateTranscription(null);
    transcriptAllRef.current = '';
    setIsProvisional(false);
    try {
      sessionChunksRef.current.clear();
      lastChunkTextRef.current = '';
      lastTailRef.current = null;

      // Initialize session timing
      sessionStartRef.current = null;
      sessionSamplesSentRef.current = 0;

      // request microphone
      const desiredSampleRate = 48000;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: desiredSampleRate,
          channelCount: 1,
          // request raw audio (disable browser processing) to improve ASR quality
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleSize: 16,
        },
      });

      const AudioCtxCtor: any = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxCtor({ sampleRate: desiredSampleRate });
      audioContextRef.current = audioCtx;
      streamRef.current = stream;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      buffersRef.current = [];

      // prefer AudioWorklet but fallback gracefully
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
          const bufferSize = 1024;
          const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
          processorRef.current = processor;
          processor.onaudioprocess = (e: any) => {
            const input = e.inputBuffer.getChannelData(0);
            buffersRef.current.push(new Float32Array(input));
          };
          source.connect(processor);
        }
      } else {
        const bufferSize = 1024;
        const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e: any) => {
          const input = e.inputBuffer.getChannelData(0);
          buffersRef.current.push(new Float32Array(input));
        };
        source.connect(processor);
      }

      sessionIdRef.current = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      chunkIndexRef.current = 0;

  // timeslice for chunk upload (increasing slightly to create longer chunks)
  const timesliceMs = 2500;
      chunkIntervalRef.current = window.setInterval(flushBufferAndUpload, timesliceMs);

      // Start periodic polling to pick up refined session text from server
      try {
        if (sessionPollIntervalRef.current) clearInterval(sessionPollIntervalRef.current);
        sessionPollIntervalRef.current = window.setInterval(() => {
          if (!sessionIdRef.current) return;
          // optionally skip polling when too many uploads in flight
          if (concurrentUploadsRef.current > 2) return;
          pollSession().catch(() => {});
        }, 1500);
      } catch (e) {
        console.warn('Failed to start session polling', e);
      }

      // We will request session snapshot immediately after each upload as well.

      setIsRecording(true);
      sessionStartRef.current = Date.now();
    } catch (e: any) {
      setError(e?.message || "Impossible d'accéder au micro");
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);

      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
        chunkIntervalRef.current = null;
      }

      // stop polling session snapshots
      if (sessionPollIntervalRef.current) {
        clearInterval(sessionPollIntervalRef.current);
        sessionPollIntervalRef.current = null;
      }

      // Flush any remaining audio
      await flushBufferAndUpload();

      // Wait a short while for last uploads to be processed
      await new Promise((r) => setTimeout(r, 900));

      // Ask backend for final aggregation
      try {
        if (sessionIdRef.current) {
          setLoading(true);
          const res = await api.post(`/whisper/session/${sessionIdRef.current}/finalize`, {}, {
            timeout: 60000,
          });

          if (res?.data?.text) {
            const finalText = normalizeText(res.data.text);
            transcriptAllRef.current = finalText;
            updateTranscription(finalText);
            // final text available => not provisional
            setIsProvisional(false);
            if (onTranscription && finalText) {
              onTranscription(finalText, { replace: autoInsert === 'replace' });
              setLastInserted({ text: finalText, at: Date.now() });
            }
          } else {
            const assembled = normalizeText(assembleChunks(sessionChunksRef.current));
            if (assembled) {
              transcriptAllRef.current = assembled;
              updateTranscription(assembled);
              setIsProvisional(false);
              if (onTranscription) {
                onTranscription(assembled, { replace: autoInsert === 'replace' });
                setLastInserted({ text: assembled, at: Date.now() });
              }
            }
          }
        }
      } catch (e: any) {
        console.error('session finalize error:', e);
        const assembled = normalizeText(assembleChunks(sessionChunksRef.current));
        if (assembled) {
          transcriptAllRef.current = assembled;
          updateTranscription(assembled);
          setIsProvisional(false);
          if (onTranscription) {
            onTranscription(assembled, { replace: autoInsert === 'replace' });
            setLastInserted({ text: assembled, at: Date.now() });
          }
        } else {
          setError('Échec de la finalisation: ' + (e?.message || 'unknown error'));
        }
      } finally {
        setLoading(false);
      }

      // Clean up audio resources
      try {
        const proc = processorRef.current;
        if (proc) {
          if ((proc as any).port) {
            try { proc.port.onmessage = null; } catch {}
            try { (proc as any).disconnect?.(); } catch {}
          } else {
            try { proc.disconnect(); } catch {}
          }
        }
      } catch (e) {}
      try { sourceRef.current?.disconnect(); } catch {}
      processorRef.current = null;
      sourceRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      try { await audioContextRef.current?.close(); } catch {}
      audioContextRef.current = null;
    } catch (e) {
      console.error('Stop recording error:', e);
      setError("Échec de l'arrêt de l'enregistrement");
      setIsRecording(false);
      setLoading(false);
    }
  };

  const onFileChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    sessionChunksRef.current.clear();
    sessionIdRef.current = null;
    chunkIndexRef.current = 0;
    lastChunkTextRef.current = '';
    lastTailRef.current = null;
    // reset session timing
    sessionStartRef.current = null;
    sessionSamplesSentRef.current = 0;
    setIsProvisional(false);
    await uploadBlob(f);
  };

  return (
    <div className={`flow-card ${compact ? 'p-3' : 'p-4 max-w-2xl'} flow-border`}>
      {/* Language Selection */}
      {!compact && (
        <div className="mb-3">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording}
            className="text-xs bg-background border border-input rounded px-2 py-1"
          >
            <option value="auto">🌍 Auto-détection</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇺🇸 English</option>
            <option value="es">🇪🇸 Español</option>
            <option value="ar">🇸🇦 العربية</option>
          </select>
        </div>
      )}

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

     {/* Show transcription text if available */}
      {/*transcription && (
        <div className={`mt-3 text-sm whitespace-pre-wrap break-words bg-muted/50 rounded p-2 ${compact ? 'max-h-20 overflow-auto' : 'max-h-32 overflow-auto'}`}>
          <div className="flex items-center justify-between">
            <div className="break-words flex-1">{transcription}</div>
            {isProvisional && (
              <div className="ml-3 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">
                préliminaire
              </div>
            )}
          </div>
        </div>
      )*/} 
    </div>
  );
}