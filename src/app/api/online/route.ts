/**
 * Too Many Beats — Online presence counters
 *
 * GET /api/online
 * → { online: N, matchmaking: N }
 *
 * POST /api/online { action: 'ping' }
 * → Updates the caller's last-seen timestamp so they count as online
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabase } from '@/lib/db';

// Keep a simple presence table: username + last_seen
// Run this SQL once in Supabase:
//
// CREATE TABLE IF NOT EXISTS presence (
//   username   TEXT PRIMARY KEY,
//   last_seen  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );
// ALTER TABLE presence DISABLE ROW LEVEL SECURITY;

const ONLINE_WINDOW_MS = 30_000; // 30 seconds

export async function GET() {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  // Count online players
  const { count: onlineCount } = await supabase
    .from('presence')
    .select('*', { count: 'exact', head: true })
    .gte('last_seen', since);

  // Count players in matchmaking queue
  const { count: mmCount } = await supabase
    .from('matchmaking_queue')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    online:      onlineCount ?? 0,
    matchmaking: mmCount     ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ ok: false });

  const me = session.user;

  await supabase
    .from('presence')
    .upsert({ username: me, last_seen: new Date().toISOString() }, { onConflict: 'username' });

  // Also clean up stale presence rows
  await supabase
    .from('presence')
    .delete()
    .lt('last_seen', new Date(Date.now() - 120_000).toISOString());

  return NextResponse.json({ ok: true });
}
