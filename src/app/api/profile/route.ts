/**
 * Too Many Beats — Profile API
 *
 * GET  /api/profile          → { ship_color }
 * POST /api/profile { ship_color: 'cyan' }  → saves ship_color
 *
 * Run this in Supabase SQL editor once:
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS ship_color TEXT DEFAULT 'auto';
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabase } from '@/lib/db';

const VALID_COLORS = ['auto','cyan','pink','green','orange','red','gold','white','purple','blue'];

export async function GET() {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select('ship_color')
    .eq('username', session.user)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ship_color: data?.ship_color ?? 'auto' });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const color = (body.ship_color ?? 'auto').toString();

  if (!VALID_COLORS.includes(color)) {
    return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
  }

  const { error } = await supabase
    .from('users')
    .update({ ship_color: color })
    .eq('username', session.user);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ship_color: color });
}