/**
 * Too Many Beats — Matchmaking API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabase } from '@/lib/db';

const MATCHMAKING_LEVEL_COUNT = 21;

function randomMatchId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Try to pair `me` with someone in the queue. Returns match data or null. */
async function tryPair(me: string) {
  // Find the oldest waiting player that isn't me
  const { data: waiting, error: waitErr } = await supabase
    .from('matchmaking_queue')
    .select('username')
    .neq('username', me)
    .order('created_at', { ascending: true })
    .limit(1);

  if (waitErr) {
    console.error('[mm] queue read error:', JSON.stringify(waitErr));
    return null;
  }

  if (!waiting || waiting.length === 0) return null;

  const opponent = waiting[0].username;

  // Atomically remove both — if the delete affects 0 rows for opponent,
  // someone else already grabbed them, so we bail
  const { error: dequeueErr, count } = await supabase
    .from('matchmaking_queue')
    .delete({ count: 'exact' })
    .in('username', [me, opponent]);

  if (dequeueErr) {
    console.error('[mm] dequeue error:', JSON.stringify(dequeueErr));
    return null;
  }

  // If we didn't remove at least the opponent row, they were already taken
  if ((count ?? 0) < 1) {
    console.log('[mm] opponent already matched, retrying...');
    return null;
  }

  const levelIndex = Math.floor(Math.random() * MATCHMAKING_LEVEL_COUNT);
  const matchId    = randomMatchId();

  console.log('[mm] creating match:', matchId, me, 'vs', opponent, 'level:', levelIndex);

  const { error: insertErr } = await supabase.from('matches').insert({
    id:          matchId,
    level_name:  `level${levelIndex + 1}`,
    level_index: levelIndex,
    player1:     me,
    player2:     opponent,
    p1_score:    0,
    p2_score:    0,
    p1_dead:     false,
    p2_dead:     false,
    winner:      null,
    updated_at:  new Date().toISOString(),
  });

  if (insertErr) {
    console.error('[mm] match insert error:', JSON.stringify(insertErr));
    return null;
  }

  return { matchId, levelIndex, opponent };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: 'You must be logged in to matchmake.' }, { status: 401 });
  }

  const body   = await req.json().catch(() => ({}));
  const action = body.action as string;
  const me     = session.user;

  // ── join ─────────────────────────────────────────────────────
  if (action === 'join') {
    // Clean stale entries older than 2 minutes
    await supabase
      .from('matchmaking_queue')
      .delete()
      .lt('created_at', new Date(Date.now() - 120_000).toISOString());

    // Add myself to the queue (upsert in case of re-join)
    const { error: upsertErr } = await supabase
      .from('matchmaking_queue')
      .upsert(
        { username: me, created_at: new Date().toISOString() },
        { onConflict: 'username' }
      );

    if (upsertErr) {
      console.error('[mm] queue upsert error:', JSON.stringify(upsertErr));
      return NextResponse.json({ error: 'Failed to join queue.', detail: upsertErr }, { status: 500 });
    }

    console.log('[mm] joined queue:', me);

    // Small random stagger so simultaneous joins don't always collide
    await new Promise(r => setTimeout(r, Math.random() * 600 + 100));

    // Try to pair immediately
    const match = await tryPair(me);
    if (match) {
      return NextResponse.json({ status: 'matched', ...match });
    }

    return NextResponse.json({ status: 'waiting' });
  }

  // ── poll ─────────────────────────────────────────────────────
  if (action === 'poll') {
    // 1. Check if a match already exists for me — no time window, any active match counts
    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select('*')
      .or(`player1.ilike.${me},player2.ilike.${me}`)   // ilike = case-insensitive
      .is('winner', null)                               // still active (not finished)
      .order('created_at', { ascending: false })
      .limit(1);

    if (matchErr) console.error('[mm] poll match query error:', JSON.stringify(matchErr));

    if (matches && matches.length > 0) {
      const m        = matches[0];
      const opponent = m.player1.toLowerCase() === me.toLowerCase() ? m.player2 : m.player1;
      console.log('[mm] poll: found existing match', m.id, 'for', me);
      return NextResponse.json({
        status:     'matched',
        matchId:    m.id,
        levelIndex: m.level_index,
        opponent,
      });
    }

    // 2. No match yet — make sure I'm still in the queue
    const { data: inQueue } = await supabase
      .from('matchmaking_queue')
      .select('username')
      .ilike('username', me)
      .limit(1);

    if (!inQueue || inQueue.length === 0) {
      // Was removed by a tryPair that then failed to insert the match — re-add
      console.log('[mm] poll: not in queue, re-adding', me);
      await supabase
        .from('matchmaking_queue')
        .upsert({ username: me, created_at: new Date().toISOString() }, { onConflict: 'username' });
    }

    // 3. Try to pair now
    const match = await tryPair(me);
    if (match) {
      console.log('[mm] poll: paired', me, 'with', match.opponent);
      return NextResponse.json({ status: 'matched', ...match });
    }

    return NextResponse.json({ status: 'waiting' });
  }

  // ── cancel ───────────────────────────────────────────────────
  if (action === 'cancel') {
    const { error: delErr, count } = await supabase
      .from('matchmaking_queue')
      .delete({ count: 'exact' })
      .eq('username', me);

    if (delErr) console.error('[mm] cancel delete error:', JSON.stringify(delErr));
    console.log('[mm] cancel: removed', me, 'rows deleted:', count);

    return NextResponse.json({ status: 'cancelled' });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}