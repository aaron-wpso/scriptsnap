"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type Phase =
  | { kind: "idle" }
  | { kind: "pending";    id: string; url: string }
  | { kind: "processing"; id: string; url: string }
  | { kind: "completed";  url: string; audioUrl: string | null; transcript: string }
  | { kind: "failed";     url: string; error: string };

const STEPS = ["Submitted", "Fetching audio", "Transcribing", "Done"];

function stepIndex(phase: Phase): number {
  if (phase.kind === "pending")    return 1;
  if (phase.kind === "processing") return 2;
  if (phase.kind === "completed")  return 3;
  return 0;
}

export default function TranscribeForm({ accessToken }: { accessToken: string }) {
  const [urlInput, setUrlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [copied, setCopied] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to realtime + poll every 3s as fallback
  useEffect(() => {
    if (phase.kind !== "pending" && phase.kind !== "processing") {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const { id, url } = phase;

    const applyRow = (row: Record<string, unknown>) => {
      if (row.Status === "Processing") {
        setPhase(p => (p.kind === "pending" || p.kind === "processing")
          ? { kind: "processing", id, url } : p);
      } else if (row.Status === "Completed") {
        setPhase({
          kind: "completed",
          url,
          audioUrl: row.AudioUrl ? String(row.AudioUrl) : null,
          transcript: String(row.Transcript ?? ""),
        });
      } else if (row.Status === "Failed") {
        setPhase({ kind: "failed", url, error: String(row.ErrorMessage ?? "Transcription failed. Please try again.") });
      }
    };

    // Realtime subscription
    const channel = supabase
      .channel(`txn-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "Transcriptions",
        filter: `Id=eq.${id}`,
      }, (payload) => applyRow(payload.new as Record<string, unknown>))
      .subscribe();

    channelRef.current = channel;

    // Polling fallback — checks every 3s in case Realtime isn't set up
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("Transcriptions")
        .select("Status, Transcript, ErrorMessage, AudioUrl")
        .eq("Id", id)
        .single();
      if (data) applyRow(data as Record<string, unknown>);
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      clearInterval(poll);
    };
  }, [phase.kind]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch(`${API_URL}/api/transcriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url: urlInput }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPhase({ kind: "failed", url: urlInput, error: data.error ?? "Something went wrong. Please try again." });
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    setPhase({ kind: "pending", id: data.id, url: urlInput });
    setUrlInput("");
    setSubmitting(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── IDLE / FAILED ──────────────────────────────────────────────
  if (phase.kind === "idle" || phase.kind === "failed") {
    return (
      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            placeholder="https://www.tiktok.com/@user/video/..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            required
            className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-indigo-600 text-white rounded-lg px-5 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50 whitespace-nowrap transition-colors"
          >
            {submitting ? "Submitting…" : "Transcribe"}
          </button>
        </form>
        {phase.kind === "failed" && (
          <p className="text-red-400 text-sm">{phase.error}</p>
        )}
      </div>
    );
  }

  // ── PROCESSING ─────────────────────────────────────────────────
  if (phase.kind === "pending" || phase.kind === "processing") {
    const active = stepIndex(phase);
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-5 overflow-hidden">
        <p className="text-xs text-gray-500 truncate">{phase.url}</p>

        {/* Step tracker — labels hidden on mobile to prevent overflow */}
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const done    = i < active;
            const current = i === active;
            const waiting = i > active;
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none min-w-0">
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all
                    ${done    ? "bg-green-500 text-white" : ""}
                    ${current ? "bg-indigo-500 text-white ring-4 ring-indigo-500/30 animate-pulse" : ""}
                    ${waiting ? "bg-gray-800 border border-gray-700 text-gray-600" : ""}
                  `}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`hidden sm:block text-xs whitespace-nowrap
                    ${done    ? "text-green-400" : ""}
                    ${current ? "text-indigo-400" : ""}
                    ${waiting ? "text-gray-600"   : ""}
                  `}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-4 sm:mb-6 transition-colors
                    ${i < active ? "bg-green-500" : "bg-gray-700"}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── COMPLETED ──────────────────────────────────────────────────
  if (phase.kind === "completed") {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-400">✓ Transcription complete</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{phase.url}</p>
          </div>
          <button
            onClick={() => setPhase({ kind: "idle" })}
            className="text-sm text-gray-400 hover:text-indigo-400 transition-colors shrink-0 self-start"
          >
            + Transcribe another
          </button>
        </div>

        {phase.audioUrl && (
          <audio
            controls
            src={phase.audioUrl}
            className="w-full h-10 rounded-lg"
            style={{ colorScheme: "dark" }}
          />
        )}

        <div className="relative">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 pr-16 max-h-72 overflow-y-auto">
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {phase.transcript}
            </p>
          </div>
          <button
            onClick={() => handleCopy(phase.transcript)}
            className="absolute top-2 right-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md px-2.5 py-1.5 transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
