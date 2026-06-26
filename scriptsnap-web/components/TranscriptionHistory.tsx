"use client";

import { useEffect, useState, useCallback } from "react";
import ThumbnailImage from "@/components/ThumbnailImage";
import ModelSelector, { type ModelId } from "@/components/ModelSelector";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type Transcription = {
  Id: string;
  TikTokUrl: string;
  Status: "Pending" | "Processing" | "Completed" | "Failed";
  AudioUrl: string | null;
  ThumbnailUrl: string | null;
  Transcript: string | null;
  ErrorMessage: string | null;
  ModelUsed: string | null;
  CreatedAt: string;
};

const PAGE_SIZE = 10;

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

export default function TranscriptionHistory({ userId, accessToken }: { userId: string; accessToken: string }) {
  const [items, setItems]         = useState<Transcription[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [copied, setCopied]       = useState<string | null>(null);
  const [retrying, setRetrying]   = useState<string | null>(null);
  const [retryModel, setRetryModel] = useState<Record<string, ModelId>>({});
  const supabase = createClient();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p: number) => {
    const from = (p - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("Transcriptions")
      .select("*", { count: "exact" })
      .eq("UserId", userId)
      .order("CreatedAt", { ascending: false })
      .range(from, to);
    setItems(data ?? []);
    setTotal(count ?? 0);
  }, [userId]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  // Realtime: reload current page on any change
  useEffect(() => {
    const channel = supabase
      .channel("history-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "Transcriptions",
        filter: `UserId=eq.${userId}`,
      }, (payload) => {
        // On insert, jump to page 1 to show the new item
        if (payload.eventType === "INSERT") {
          setPage(1);
        } else {
          setPage(p => { load(p); return p; });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRetry = async (item: Transcription) => {
    const model = retryModel[item.Id] ?? "gemini-2.5-flash";
    setRetrying(item.Id);
    await fetch(`${API_URL}/api/transcriptions/${item.Id}/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ model }),
    });
    setRetrying(null);
  };

  if (total === 0 && items.length === 0)
    return <p className="text-gray-600 text-sm">No transcriptions yet.</p>;

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.Id} className="bg-gray-900 border border-gray-800 rounded-xl">
            {/* Row — two-line layout on mobile */}
            <div className="flex items-center gap-3 px-4 py-3">
              {item.ThumbnailUrl ? (
                <div className="relative shrink-0">
                  <ThumbnailImage
                    src={item.ThumbnailUrl}
                    className="w-10 h-10 rounded-md"
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${dot[item.Status]}`} />
                </div>
              ) : (
                <span className={`w-2 h-2 rounded-full shrink-0 ${dot[item.Status]}`} />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 truncate">{item.TikTokUrl}</p>
                {/* Timestamp on second line on mobile, inline on sm+ */}
                <p className="text-xs text-gray-600 mt-0.5 sm:hidden">
                  {new Date(item.CreatedAt).toLocaleString(undefined, {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>

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

            {item.Status === "Failed" && (
              <div className="border-t border-gray-800 px-4 py-3 space-y-2">
                {item.ErrorMessage && (
                  <p className="text-xs text-red-400">{item.ErrorMessage}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <ModelSelector
                    value={retryModel[item.Id] ?? "gemini-2.5-flash"}
                    onChange={(id) => setRetryModel(prev => ({ ...prev, [item.Id]: id }))}
                    size="sm"
                  />
                  <button
                    onClick={() => handleRetry(item)}
                    disabled={retrying === item.Id}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md px-3 py-1 transition-colors"
                  >
                    {retrying === item.Id ? "Retrying…" : "Retry"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm text-gray-400 hover:text-indigo-400 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-600">
            Page {page} of {totalPages} · {total} total
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm text-gray-400 hover:text-indigo-400 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
