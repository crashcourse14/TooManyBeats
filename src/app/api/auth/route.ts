/**
 * Too Many Beats — Auth API
 *
 * GET  /api/auth?action=me        → { user, title } | { user: null }
 * POST /api/auth  { action: 'login',    username, password }
 * POST /api/auth  { action: 'register', username, password }
 * POST /api/auth  { action: 'logout' }
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { readUsers, createUser } from '@/lib/db';

// ── GET /api/auth?action=me ────────────────────────────────────
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');

  if (action === 'me') {
    const session = await getSession();
    if (!session.user) {
      return NextResponse.json({ user: null, title: null });
    }
    const users  = await readUsers();
    const record = users.find(u => u.username.toLowerCase() === session.user!.toLowerCase());
    return NextResponse.json({
      user:  session.user,
      title: record?.active_title ?? null,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
}

// ── POST /api/auth ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => ({}));
  const action = body.action as string;

  // ── login ──────────────────────────────────────────────────
  if (action === 'login') {
    const username = (body.username as string | undefined)?.trim() ?? '';
    const password = (body.password as string | undefined) ?? '';

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const users = await readUsers();
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    // if we have no user or the stored hash is missing/invalid, bail out
    if (!found || !found.password_hash || !(await bcrypt.compare(password, found.password_hash))) {
      return NextResponse.json({ error: 'Incorrect username or password.' }, { status: 401 });
    }

    const session = await getSession();
    session.user  = found.username;
    await session.save();

    return NextResponse.json({ ok: true, user: found.username, title: found.active_title ?? null });
  }

  // ── register ───────────────────────────────────────────────
  if (action === 'register') {
    const username = (body.username as string | undefined)?.trim() ?? '';
    const password = (body.password as string | undefined) ?? '';

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }
    if (username.length < 2 || username.length > 24) {
      return NextResponse.json({ error: 'Username must be 2–24 characters.' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
      return NextResponse.json({ error: 'Username may only contain letters, numbers, _ and -.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const users = await readUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 });
    }

    const newUser = {
      username,
      password_hash: await bcrypt.hash(password, 12),
      active_title:  null as string | null,
      titles:       [] as string[],
      created_at:    new Date().toISOString(),
    };

    // insert the new row instead of overwriting the whole table
    await createUser(newUser);

    const session = await getSession();
    session.user  = username;
    await session.save();

    return NextResponse.json({ ok: true, user: username }, { status: 201 });
  }

  // ── logout ─────────────────────────────────────────────────
  if (action === 'logout') {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 404 });
}
