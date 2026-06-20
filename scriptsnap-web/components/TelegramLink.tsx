"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME!;

type LinkStatus = "loading" | "linked" | "unlinked";

export default function TelegramLink() {
  const [status, setStatus] = useState<LinkStatus>("loading");
  const [linkedUsername, setLinkedUsername] = useState<string | null>(null);
  const [telegramId, setTelegramId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("TelegramUsers")
        .select("TelegramId, Username")
        .eq("UserId", user.id)
        .maybeSingle();

      if (data) {
        setStatus("linked");
        setLinkedUsername(data.Username ?? String(data.TelegramId));
      } else {
        setStatus("unlinked");
      }
    };
    load();
  }, []);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(`${API_URL}/api/telegram/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ telegramId: Number(telegramId), username: null }),
    });

    if (res.ok) {
      setStatus("linked");
      setLinkedUsername(telegramId);
    } else {
      setError("Failed to link. Check the Telegram ID and try again.");
    }

    setSaving(false);
  };

  const handleUnlink = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();

    await fetch(`${API_URL}/api/telegram/link`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    setStatus("unlinked");
    setTelegramId("");
    setSaving(false);
  };

  if (status === "loading")
    return <p className="text-sm text-gray-500">Loading...</p>;

  if (status === "linked") {
    return (
      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl p-4">
        <div>
          <p className="text-sm font-medium text-green-400">Telegram linked</p>
          <p className="text-xs text-green-500/80 mt-0.5">ID: {linkedUsername}</p>
        </div>
        <button
          onClick={handleUnlink}
          disabled={saving}
          className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          Unlink
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-sm text-indigo-300 space-y-2">
        <p className="font-medium text-indigo-200">How to find your Telegram ID:</p>
        <ol className="list-decimal list-inside space-y-1 text-indigo-300">
          <li>Open Telegram and message{" "}
            <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-100">
              @userinfobot
            </a>
          </li>
          <li>It will reply with your numeric user ID</li>
          {BOT_USERNAME && (
            <li>Then start{" "}
              <a href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-100">
                @{BOT_USERNAME}
              </a>
            </li>
          )}
        </ol>
      </div>

      <form onSubmit={handleLink} className="flex gap-3">
        <input
          type="number"
          placeholder="Your Telegram user ID"
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
          required
          className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white rounded-lg px-5 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {saving ? "Linking..." : "Link"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
