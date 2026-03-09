/**
 * Too Many Beats — Match State API
 *
 * GET  /api/match?id=<matchId>
 *   → Full match state including both players' scores, death status, winner
 *
 * POST /api/match  { matchId, action: 'score', score }
 *   → Update my current score in the match
 *
 * POST /api/match  { matchId, action: 'die', score }
 *   → Report that I died. Sets winner to opponent if opponent still alive.
 *
 * POST /api/match  { matchId, action: 'playerInfo' }
 *   → Returns enriched player info (leaderboard rank, best score, title) for pre-game screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabase, readUsers, readLeaderboard, readTitles } from '@/lib/db';

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('id');
  if (!matchId) return NextResponse.json({ error: 'Missing match id.' }, { status: 400 });

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  }

  const body    = await req.json().catch(() => ({}));
  const matchId = body.matchId as string;
  const action  = body.action as string;
  const me      = session.user;

  if (!matchId) return NextResponse.json({ error: 'Missing matchId.' }, { status: 400 });

  // ── playerInfo ───────────────────────────────────────────────
  // Called before the match starts to populate the pre-game screen
  if (action === 'playerInfo') {
    const targetUser = (body.username as string) || me;

    try {
      const [users, leaderboard, titles] = await Promise.all([
        readUsers(),
        readLeaderboard(),
        readTitles(),
      ]);

      const userRecord = users.find(
        u => u.username.toLowerCase() === targetUser.toLowerCase()
      );

      // Best score across all levels
      const myEntries  = leaderboard.filter(e => e.name.toLowerCase() === targetUser.toLowerCase());
      const bestScore  = myEntries.length > 0 ? Math.max(...myEntries.map(e => e.score)) : 0;

      // Global rank (by best score across all levels)
      const playerTotals = new Map<string, number>();
      for (const entry of leaderboard) {
        const cur = playerTotals.get(entry.name.toLowerCase()) ?? 0;
        if (entry.score > cur) playerTotals.set(entry.name.toLowerCase(), entry.score);
      }
      const sorted = [...playerTotals.entries()].sort((a, b) => b[1] - a[1]);
      const rankIdx = sorted.findIndex(([n]) => n === targetUser.toLowerCase());
      const rank    = rankIdx === -1 ? null : rankIdx + 1;

      // Active title label
      const titleId    = userRecord?.active_title ?? null;
      const titleDef   = titleId ? titles.find(t => t.id === titleId) : null;
      const titleLabel = titleDef?.label ?? null;
      const titleClass = titleDef?.class ?? null;

      return NextResponse.json({
        username:     targetUser,
        bestScore,
        rank,
        titleLabel,
        titleClass,
        activeBanner: userRecord?.active_banner ?? null,
        avatarUrl:    userRecord?.avatar_url    ?? null,
      });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Fetch the match for score/die actions
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
  }

  const isP1 = match.player1.toLowerCase() === me.toLowerCase();
  const isP2 = match.player2.toLowerCase() === me.toLowerCase();
  if (!isP1 && !isP2) {
    return NextResponse.json({ error: 'You are not in this match.' }, { status: 403 });
  }

  // ── score ────────────────────────────────────────────────────
  if (action === 'score') {
    const score = parseInt(body.score, 10) || 0;
    const field = isP1 ? 'p1_score' : 'p2_score';

    await supabase
      .from('matches')
      .update({ [field]: score, updated_at: new Date().toISOString() })
      .eq('id', matchId);

    return NextResponse.json({ ok: true });
  }

  // ── die ──────────────────────────────────────────────────────
  if (action === 'die') {
    const score      = parseInt(body.score, 10) || 0;
    const deadField  = isP1 ? 'p1_dead'  : 'p2_dead';
    const scoreField = isP1 ? 'p1_score' : 'p2_score';
    const opponent   = isP1 ? match.player2 : match.player1;
    const oppDead    = isP1 ? match.p2_dead  : match.p1_dead;

    // Set winner to opponent only if opponent is still alive
    const winner = !match.winner ? (oppDead ? null : opponent) : match.winner;

    await supabase
      .from('matches')
      .update({
        [deadField]:  true,
        [scoreField]: score,
        winner,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', matchId);

    return NextResponse.json({ ok: true, winner });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}