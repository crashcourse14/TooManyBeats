/**
 * Too Many Beats — Version API
 *
 * GET /api/version → { version: "Beta 1.030926" }
 *
 * To push an update alert to all players, just change the version
 * string in /data/game_version.json and redeploy.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'data', 'game_version.json');
    const raw      = readFileSync(filePath, 'utf-8');
    const { version } = JSON.parse(raw);
    return NextResponse.json({ version }, {
      headers: { 'Cache-Control': 'no-store' }, // always fresh
    });
  } catch {
    return NextResponse.json({ error: 'Could not read version' }, { status: 500 });
  }
}