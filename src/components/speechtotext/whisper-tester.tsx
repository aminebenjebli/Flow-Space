"use client";

import React, { useRef, useState } from "react";
import { api } from "@/lib/api/axios";
import { Button } from "@/components/ui/button";
import { Play, StopCircle, UploadCloud, CheckCircle } from "lucide-react";

type TranscriptionCallback = (text: string, opts?: { replace?: boolean }) => void;

export default function WhisperTester({ onTranscription, compact = true, autoInsert = 'append' }: { onTranscription?: TranscriptionCallback; compact?: boolean; autoInsert?: 'append' | 'replace' | false }) {
  const [transcription, setTranscription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastInserted, setLastInserted] = useState<{ text: string; at: number } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const extractText = (res: any) => {
    if (!res) return null;
    if (typeof res === "string") return res;
    if (res?.text) return res.text;
    if (res?.data?.text) return res.data.text;
    if (res?.data && typeof res.data === "string") return res.data;
    return JSON.stringify(res);
  };

  const uploadBlob = async (blob: Blob) => {
    setLoading(true);
    setError(null);
    setTranscription(null);
    try {
      const fd = new FormData();
      fd.append("audio", blob, `upload-${Date.now()}.webm`);
      const res = await api.post("/whisper/transcribe", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        // Allow longer server processing (e.g. transcription) up to 2 minutes
        timeout: 120000,
      });
      const text = extractText(res) || "(aucune transcription)";
      setTranscription(text);
      // If autoInsert is configured, forward the transcription automatically
      try {
        if (autoInsert && onTranscription) {
          const replace = autoInsert === 'replace';
          onTranscription(text, { replace });
          // record last inserted for compact UI
          setLastInserted({ text, at: Date.now() });
        }
      } catch (e) {
        console.warn('autoInsert callback error', e);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    await uploadBlob(f);
  };

  const startRecording = async () => {
    setError(null);
    setTranscription(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      recordedChunksRef.current = [];

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        try {
          await uploadBlob(blob);
        } catch (e) {
          console.error(e);
        }
      };

      mr.onerror = (ev) => {
        console.error("MediaRecorder error", ev);
        setError("Erreur d'enregistrement");
      };

      mr.start();
      setIsRecording(true);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Impossible d'accéder au micro");
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    } catch (e) {
      console.error(e);
      setError("Échec de l'arrêt de l'enregistrement");
    }
  };

  return (
    <div className={`flow-card ${compact ? 'p-3' : 'p-4 max-w-2xl'} flow-border`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={startRecording} disabled={isRecording} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            <span className="text-sm">{isRecording ? "Enregistrement" : "Démarrer"}</span>
          </Button>

          <Button size="sm" variant="outline" onClick={stopRecording} disabled={!isRecording} className="flex items-center gap-2">
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
              <span className="text-sm text-muted-foreground">{isRecording ? "Enregistrement" : "Prêt"}</span>
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

      {/* Transcription is auto-inserted into Quick Add; no preview to save space */}
    </div>
  );
}
