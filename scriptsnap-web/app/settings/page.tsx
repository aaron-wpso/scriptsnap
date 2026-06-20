import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TelegramLink from "@/components/TelegramLink";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="text-xl font-bold text-white">
          Script<span className="text-indigo-400">Snap</span>
        </Link>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">
            Sign out
          </button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-indigo-400 transition-colors inline-block">
          ← Back to dashboard
        </Link>

        <section className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white">Account</h2>
          <p className="text-sm text-gray-400">{user.email}</p>
        </section>

        <section className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Telegram</h2>
            <p className="text-sm text-gray-400 mt-1">
              Link your Telegram account to transcribe videos directly from the bot.
            </p>
          </div>
          <TelegramLink />
        </section>
      </main>
    </div>
  );
}
