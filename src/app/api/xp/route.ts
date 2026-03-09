/**
 * Too Many Beats — XP API
 *
 * GET  /api/xp          → { xp: number, xpLevel: number, xpForNext: number }
 * POST /api/xp { score } → awards XP = floor(score / 10), returns updated totals
 *
 * Run this in Supabase SQL editor once:
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabase } from '@/lib/db';

const XP_PER_LEVEL = 20_000;

function calcXpLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function xpForNextLevel(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL);
  return (level + 1) * XP_PER_LEVEL;
}

export async function GET() {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select('xp')
    .eq('username', session.user)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const xp       = data?.xp ?? 0;
  return NextResponse.json({
    xp,
    xpLevel:    calcXpLevel(xp),
    xpForNext:  xpForNextLevel(xp),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const body  = await req.json().catch(() => ({}));
  const score = parseInt(body.score, 10) || 0;
  if (score <= 0) return NextResponse.json({ error: 'Invalid score' }, { status: 400 });

  const earned = Math.floor(score / 10);

  // Fetch current XP then increment (Supabase doesn't have atomic increment via REST easily)
  const { data: row, error: fetchErr } = await supabase
    .from('users')
    .select('xp')
    .eq('username', session.user)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const oldXp    = row?.xp ?? 0;
  const newXp    = oldXp + earned;
  const oldLevel = calcXpLevel(oldXp);
  const newLevel = calcXpLevel(newXp);

  const { error: updateErr } = await supabase
    .from('users')
    .update({ xp: newXp })
    .eq('username', session.user);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({
    ok:         true,
    earned,
    xp:         newXp,
    xpLevel:    newLevel,
    xpForNext:  xpForNextLevel(newXp),
    leveledUp:  newLevel > oldLevel,
  });
}