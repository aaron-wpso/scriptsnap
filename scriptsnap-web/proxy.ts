import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Fail closed — missing config means no auth, so block all protected routes
  if (!supabaseUrl || !supabaseKey) {
    if (!pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // Allow POST to /auth/* through (e.g. /auth/signout) even when authenticated
  if (user && pathname.startsWith("/auth") && request.method === "GET") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/settings/:path*", "/auth/:path*"],
};
