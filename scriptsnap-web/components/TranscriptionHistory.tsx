"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Transcription = {
  Id: string;
  TikTokUrl: string;
  Status: "Pending" | "Processing" | "Completed" | "Failed";
  AudioUrl: string | null;
  Transcript: string | null;
  ErrorMessage: string | null;
  CreatedAt: string;
};

const badge: Record<string, string> = {
  Pending:    "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  Processing: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  Completed:  "bg-green-500/20  text-green-300  border border-green-500/30",
  Failed:     "bg-red-500/20    text-red-300    border border-red-500/30",
};

const dot: Record<string, string> = {
  Pending:    "bg-yellow-400 animate-pulse",
  Processing: "bg-indigo-400 animate-pulse",
  Completed:  "bg-green-400",
  Failed:     "bg-red-400",
};

export default function TranscriptionHistory({ userId }: { userId: string }) {
  const [items, setItems]       = useState<Transcription[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied]     = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("Transcriptions")
        .select("*")
        .eq("UserId", userId)
        .order("CreatedAt", { ascending: false });
      setItems(data ?? []);
    };

    load();

    const channel = supabase
      .channel("history-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "Transcriptions",
        filter: `UserId=eq.${userId}`,
      }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (items.length === 0)
    return <p className="text-gray-600 text-sm">No transcriptions yet.</p>;

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.Id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot[item.Status]}`} />

            <p className="text-sm text-gray-300 truncate flex-1 min-w-0">
              {item.TikTokUrl}
            </p>

            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge[item.Status]}`}>
              {item.Status}
            </span>

            <span className="text-xs text-gray-600 shrink-0 hidden sm:block">
              {new Date(item.CreatedAt).toLocaleString(undefined, {
                month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>

            {item.Status === "Completed" && item.Transcript && (
              <button
                onClick={() => setExpanded(expanded === item.Id ? null : item.Id)}
                className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0 transition-colors"
              >
                {expanded === item.Id ? "Hide" : "Show"}
              </button>
            )}
          </div>

          {expanded === item.Id && (
            <div className="border-t border-gray-800 px-4 py-3 space-y-3">
              {item.AudioUrl && (
                <audio
                  controls
                  src={item.AudioUrl}
                  className="w-full h-10 rounded-lg"
                  style={{ colorScheme: "dark" }}
                />
              )}
              {item.Transcript && (
                <div className="relative">
                  <div className="bg-gray-800 rounded-lg p-3 pr-16 max-h-56 overflow-y-auto">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {item.Transcript}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(item.Id, item.Transcript!)}
                    className="absolute top-2 right-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md px-2.5 py-1.5 transition-colors"
                  >
                    {copied === item.Id ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}

          {item.Status === "Failed" && item.ErrorMessage && (
            <div className="border-t border-gray-800 px-4 py-2">
              <p className="text-xs text-red-400">{item.ErrorMessage}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
