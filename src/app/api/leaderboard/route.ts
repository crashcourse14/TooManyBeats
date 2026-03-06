/**
 * Too Many Beats — Leaderboard API
 *
 * GET  /api/leaderboard          → LeaderboardEntry[] sorted by score desc
 * POST /api/leaderboard          { score, level, combo }
 *      Requires session. Adds run score to cumulative total for player+level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  readLeaderboard,
  upsertLeaderboardEntry,
  readUsers,
  LeaderboardEntry,
} from '@/lib/db';

// ── GET /api/leaderboard ───────────────────────────────────────
export async function GET() {
  const entries = await readLeaderboard();

  // Attach each player's active title
  const users    = await readUsers();
  const titleMap = new Map(users.map(u => [u.username.toLowerCase(), u.active_title ?? null]));

  const withTitles: LeaderboardEntry[] = entries.map(e => ({
    ...e,
    title: titleMap.get((e.name ?? '').toLowerCase()) ?? null,
  }));

  withTitles.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return NextResponse.json(withTitles);
}

// ── POST /api/leaderboard ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: 'You must be logged in to submit a score.' }, { status: 401 });
  }

  const body  = await req.json().catch(() => ({}));
  const score = parseInt(body.score, 10);
  const level = (body.level as string | undefined)?.trim() ?? '';
  const combo = parseInt(body.combo, 10) || 0;

  if (!score || score <= 0) {
    return NextResponse.json({ error: 'Score must be a positive integer.' }, { status: 400 });
  }

  const username       = session.user;
  const existingEntries = await readLeaderboard();

  const existing = existingEntries.find(
    e =>
      e.name.toLowerCase()  === username.toLowerCase() &&
      e.level.toLowerCase() === level.toLowerCase()
  );

  const newTotal = (existing?.score ?? 0) + score;
  const newCombo = Math.max(existing?.combo ?? 0, combo);

  await upsertLeaderboardEntry({
    name:      username,
    level,
    score:     newTotal,
    combo:     newCombo,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, newTotal });
}                         