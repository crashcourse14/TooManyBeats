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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
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
    // Clean stale entries
    await supabase
      .from('matchmaking_queue')
      .delete()
      .lt('created_at', new Date(Date.now() - 120_000).toISOString());

    // Upsert myself into the queue (safe even if already present)
    const { error: upsertErr } = await supabase
      .from('matchmaking_queue')
      .upsert({ username: me, created_at: new Date().toISOString() }, { onConflict: 'username' });

    if (upsertErr) {
      console.error('[mm] queue upsert error:', JSON.stringify(upsertErr));
      return NextResponse.json({ error: 'Failed to join queue.', detail: upsertErr }, { status: 500 });
    }

    console.log('[mm] joined queue:', me);

    // Small random delay (0–800ms) so two simultaneous joins don't both see an empty queue
    await sleep(Math.random() * 800);

    // Now check for an opponent
    const { data: waiting, error: waitErr } = await supabase
      .from('matchmaking_queue')
      .select('username')
      .neq('username', me)
      .order('created_at', { ascending: true })
      .limit(1);

    if (waitErr) {
      console.error('[mm] queue read error:', JSON.stringify(waitErr));
      return NextResponse.json({ error: 'Queue read failed.', detail: waitErr }, { status: 500 });
    }

    console.log('[mm] checking for opponent, found:', waiting);

    if (waiting && waiting.length > 0) {
      const opponent = waiting[0].username;

      // Remove both from queue
      const { error: dequeueErr } = await supabase
        .from('matchmaking_queue')
        .delete()
        .in('username', [me, opponent]);

      if (dequeueErr) {
        console.error('[mm] dequeue error:', JSON.stringify(dequeueErr));
        // Don't abort — still try to create the match
      }

      const levelIndex = Math.floor(Math.random() * MATCHMAKING_LEVEL_COUNT);
      const matchId    = randomMatchId();

      console.log('[mm] creating match:', matchId, 'between', me, 'and', opponent, 'level:', levelIndex);

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
        return NextResponse.json({ error: 'Failed to create match.', detail: insertErr }, { status: 500 });
      }

      console.log('[mm] match created successfully:', matchId);

      return NextResponse.json({
        status:     'matched',
        matchId,
        levelIndex,
        opponent,
      });
    }

    // No opponent yet — client will poll
    return NextResponse.json({ status: 'waiting' });
  }

  // ── poll ─────────────────────────────────────────────────────
  if (action === 'poll') {
    const since = new Date(Date.now() - 60_000).toISOString();

    // Look for a recent match involving me
    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select('*')
      .gte('created_at', since)
      .or(`player1.eq.${me},player2.eq.${me}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (matchErr) console.error('[mm] poll match error:', JSON.stringify(matchErr));

    if (matches && matches.length > 0) {
      const match    = matches[0];
      const opponent = match.player1.toLowerCase() === me.toLowerCase()
        ? match.player2 : match.player1;

      console.log('[mm] poll found match:', match.id, 'for', me);

      return NextResponse.json({
        status:     'matched',
        matchId:    match.id,
        levelIndex: match.level_index,
        opponent,
      });
    }

    // Check if I'm still in the queue
    const { data: inQueue } = await supabase
      .from('matchmaking_queue')
      .select('username')
      .eq('username', me)
      .limit(1);

    // If removed from queue, it means the other player matched me —
    // give it one more poll to find the match row
    console.log('[mm] poll — still in queue:', !!(inQueue && inQueue.length > 0));

    return NextResponse.json({ status: 'waiting' });
  }

  // ── cancel ───────────────────────────────────────────────────
  if (action === 'cancel') {
    await supabase.from('matchmaking_queue').delete().eq('username', me);
    return NextResponse.json({ status: 'cancelled' });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
