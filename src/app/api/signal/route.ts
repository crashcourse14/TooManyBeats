/**
 * Too Many Beats — WebRTC Signaling API
 *
 * POST { action: 'offer',  matchId, sdp }   → store my offer
 * POST { action: 'answer', matchId, sdp }   → store my answer
 * POST { action: 'ice',    matchId, candidate } → store ICE candidate
 * GET  ?matchId=X&for=me  → fetch pending signals addressed to me
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabase } from '@/lib/db';

// SQL to run once in Supabase:
//
// CREATE TABLE IF NOT EXISTS webrtc_signals (
//   id         SERIAL PRIMARY KEY,
//   match_id   TEXT NOT NULL,
//   from_user  TEXT NOT NULL,
//   to_user    TEXT NOT NULL,
//   type       TEXT NOT NULL,   -- 'offer' | 'answer' | 'ice'
//   payload    TEXT NOT NULL,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );
// ALTER TABLE webrtc_signals DISABLE ROW LEVEL SECURITY;
// CREATE INDEX IF NOT EXISTS idx_signals_to ON webrtc_signals (match_id, to_user);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const body    = await req.json().catch(() => ({}));
  const me      = session.user;
  const matchId = body.matchId as string;

  if (!matchId) return NextResponse.json({ error: 'Missing matchId.' }, { status: 400 });

  // Resolve who the other player is
  const { data: match } = await supabase
    .from('matches')
    .select('player1, player2')
    .eq('id', matchId)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });

  const other = match.player1.toLowerCase() === me.toLowerCase()
    ? match.player2 : match.player1;

  if (body.action === 'offer' || body.action === 'answer') {
    await supabase.from('webrtc_signals').insert({
      match_id:  matchId,
      from_user: me,
      to_user:   other,
      type:      body.action,
      payload:   JSON.stringify(body.sdp),
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'ice') {
    await supabase.from('webrtc_signals').insert({
      match_id:  matchId,
      from_user: me,
      to_user:   other,
      type:      'ice',
      payload:   JSON.stringify(body.candidate),
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const me      = session.user;
  const matchId = req.nextUrl.searchParams.get('matchId');

  if (!matchId) return NextResponse.json({ error: 'Missing matchId.' }, { status: 400 });

  // Fetch all signals addressed to me for this match
  const { data: signals } = await supabase
    .from('webrtc_signals')
    .select('*')
    .eq('match_id', matchId)
    .eq('to_user', me)
    .order('created_at', { ascending: true });

  // Delete them after reading (consumed)
  if (signals && signals.length > 0) {
    await supabase
      .from('webrtc_signals')
      .delete()
      .in('id', signals.map((s: any) => s.id));
  }

  return NextResponse.json({ signals: signals || [] });
}