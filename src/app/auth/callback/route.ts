import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// Supabase sends the magic-link email with a link back to this route,
// carrying a one-time `code` query param. Exchanging it here sets the
// auth cookies on the response, so the browser lands on /dashboard
// already signed in.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
