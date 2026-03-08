/**
 * Too Many Beats — Titles API
 *
 * GET  /api/titles
 *      → { allTitles, activeTitle, unlocked }
 *
 * POST /api/titles  { action: 'setTitle', title: '<id>' | '' }
 *      Sets (or clears) the logged-in player's active display title.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readTitles, readUsers, updateUser } from '@/lib/db';

/** 
 * Safely parse the titles field from Supabase.
 * Supabase returns TEXT[] as a real JS array, but sometimes values
 * come through as a JSON string like '["top10","top100"]' or a
 * postgres literal like '{top10,top100}'. Handle all three cases.
 */
function parseTitles(raw: unknown): string[] {
  if (!raw) return [];

  // Already a plain JS array
  if (Array.isArray(raw)) return raw.filter(Boolean);

  if (typeof raw === 'string') {
    const s = raw.trim();

    // Postgres array literal:  {top10,top100}
    if (s.startsWith('{') && s.endsWith('}')) {
      return s
        .slice(1, -1)
        .split(',')
        .map(v => v.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
    }

    // JSON array string: ["top10","top100"]
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch { /* fall through */ }
  }

  return [];
}

// ── GET /api/titles ────────────────────────────────────────────
export async function GET() {
  try {
    const allTitles = await readTitles();
    const session   = await getSession();

    let activeTitle: string | null = null;
    let unlocked: string[]         = [];

    if (session.user) {
      const users  = await readUsers();
      const record = users.find(
        u => u.username.toLowerCase() === session.user!.toLowerCase()
      );

      if (record) {
        activeTitle = record.active_title ?? null;
        unlocked    = parseTitles(record.titles);
        console.log('[titles GET] raw titles from DB:', record.titles);
        console.log('[titles GET] parsed unlocked:', unlocked);
      }
    }

    return NextResponse.json({ allTitles, activeTitle, unlocked });
  } catch (e: any) {
    console.error('[titles GET error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST /api/titles ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.user) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    }

    const body     = await req.json().catch(() => ({}));
    const action   = body.action as string;
    const newTitle = ((body.title as string | undefined) ?? '').trim();

    if (action !== 'setTitle') {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }

    const users = await readUsers();
    const user  = users.find(
      u => u.username.toLowerCase() === session.user!.toLowerCase()
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const playerTitles = parseTitles(user.titles);

    // Validate title if not clearing
    if (newTitle !== '') {
      const allTitles = await readTitles();
      const globalIds = allTitles.map(t => t.id);

      if (!globalIds.includes(newTitle)) {
        return NextResponse.json({ error: `Title '${newTitle}' does not exist.` }, { status: 400 });
      }
      if (!playerTitles.includes(newTitle)) {
        return NextResponse.json({ error: `You have not unlocked '${newTitle}'.` }, { status: 403 });
      }
    }

    const active_title = newTitle === '' ? null : newTitle;
    await updateUser(session.user!, { active_title });

    return NextResponse.json({ ok: true, activeTitle: active_title });
  } catch (e: any) {
    console.error('[titles POST error]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}