/**
 * Too Many Beats — Avatar URL API
 *
 * GET  /api/avatar?username=X  → { avatarUrl: string | null }  (public)
 * POST /api/avatar { avatarUrl } → saves for session user (must be https://)
 *
 * Run once in Supabase SQL editor:
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  const target   = username ?? (await getSession()).user;
  if (!target) return NextResponse.json({ avatarUrl: null });

  const { data } = await supabase
    .from('users')
    .select('avatar_url')
    .ilike('username', target)
    .single();

  return NextResponse.json({ avatarUrl: data?.avatar_url ?? null });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const body      = await req.json().catch(() => ({}));
  const avatarUrl = (body.avatarUrl as string | null | undefined) ?? null;

  // Validate — must be null (clear) or a valid https:// URL
  if (avatarUrl !== null) {
    if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Avatar URL must start with https://' },
        { status: 400 }
      );
    }
    // Basic length guard
    if (avatarUrl.length > 500) {
      return NextResponse.json({ error: 'URL too long' }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('username', session.user);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, avatarUrl });
}