/**
 * Too Many Beats — Titles API
 *
 * GET  /api/titles
 *      → { allTitles, activeTitle, unlocked }
 *
 * POST /api/titles  { action: 'setTitle', title: '<id>' | '' }
 *      Sets (or clears) the logged-in player's active display title.
 *      The title id must exist in titles.json AND be in the player's
 *      unlocked list. Pass '' to clear.
 *
 * ── titles.json catalogue format ──────────────────────────────
 * [
 *   { "id": "season1_pioneer", "label": "Season 1 Pioneer", "class": "t-new"    },
 *   { "id": "top10",           "label": "Top 10",           "class": "t-top10"  },
 *   { "id": "world_record",    "label": "World Record",     "class": "t-wr"     },
 *   { "id": "custom",          "label": "Fan Favourite",    "class": "t-custom" }
 * ]
 *
 * To grant a player a title, add the id to their "titles" array in
 * data/users.json:
 *   { "username": "alice", ..., "titles": ["top10"], "activeTitle": "top10" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readTitles, readUsers, updateUser } from '@/lib/db';

// ── GET /api/titles ────────────────────────────────────────────
export async function GET() {
  const allTitles = await readTitles();
  const session   = await getSession();

  let activeTitle: string | null = null;
  let unlocked: string[]         = [];

  if (session.user) {
    const users  = await readUsers();
    const record = users.find(u => u.username.toLowerCase() === session.user!.toLowerCase());
    if (record) {
      activeTitle = record.active_title ?? null;
      unlocked    = record.titles      ?? [];
    }
  }

  return NextResponse.json({ allTitles, activeTitle, unlocked });
}

// ── POST /api/titles ───────────────────────────────────────────
export async function POST(req: NextRequest) {
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
  const idx   = users.findIndex(u => u.username.toLowerCase() === session.user!.toLowerCase());

  if (idx === -1) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // Validate title if not clearing
  if (newTitle !== '') {
    const allTitles   = await readTitles();
    const globalIds   = allTitles.map(t => t.id);
    const playerTitles = users[idx].titles ?? [];

    if (!globalIds.includes(newTitle)) {
      return NextResponse.json({ error: `Title '${newTitle}' does not exist.` }, { status: 400 });
    }
    if (!playerTitles.includes(newTitle)) {
      return NextResponse.json({ error: `You have not unlocked '${newTitle}'.` }, { status: 403 });
    }
  }

  users[idx].active_title = newTitle === '' ? null : newTitle;
  // only update the current user instead of rewriting every record
  await updateUser(session.user!, { active_title: users[idx].active_title });

  return NextResponse.json({ ok: true, activeTitle: users[idx].active_title });
}