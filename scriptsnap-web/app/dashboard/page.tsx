import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TranscribeForm from "@/components/TranscribeForm";
import TranscriptionHistory from "@/components/TranscriptionHistory";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">
      <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">
          Script<span className="text-indigo-400">Snap</span>
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/settings" className="hidden sm:block text-sm text-gray-400 hover:text-indigo-400 transition-colors">
            Settings
          </Link>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-400 hover:text-indigo-400 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-10 space-y-8 sm:space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Transcribe a TikTok video</h2>
          <TranscribeForm accessToken={(await supabase.auth.getSession()).data.session?.access_token ?? ""} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">History</h2>
          <TranscriptionHistory userId={user.id} />
        </section>
      </main>
    </div>
  );
}
