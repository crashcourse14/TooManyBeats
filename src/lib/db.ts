/**
 * Too Many Beats — JSON file database helpers
 *
 * All data files live in  <project_root>/data/
 * They are read/written on the server only (never shipped to the browser).
 *
 * For a production app with many concurrent users you would swap these
 * functions for a real database (Postgres, SQLite via Prisma, etc.).
 * For a small game leaderboard flat JSON files are perfectly fine.
 */

import fs   from 'fs';
import path from 'path';

// ── Paths ──────────────────────────────────────────────────────
const DATA_DIR        = path.join(process.cwd(), 'data');
export const USERS_FILE       = path.join(DATA_DIR, 'users.json');
export const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
export const TITLES_FILE      = path.join(DATA_DIR, 'titles.json');

// ── Types ──────────────────────────────────────────────────────
export interface User {
  username:     string;
  passwordHash: string;
  activeTitle:  string | null;
  titles:       string[];   // unlocked title IDs
  createdAt:    string;
}

export interface LeaderboardEntry {
  name:      string;
  level:     string;
  score:     number;
  combo:     number;
  timestamp: string;
  title?:    string | null; // injected at read time
}

export interface Title {
  id:    string;
  label: string;
  class: string;
}

// ── Helpers ────────────────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** Atomic write: write to a temp file then rename so readers never see a partial file. */
export function writeJson<T>(filePath: string, data: T): void {
  ensureDir();
  const tmp = filePath + '.tmp.' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ── Typed convenience accessors ────────────────────────────────

import bcrypt from 'bcryptjs';

/**
 * readUsers wraps readJson but also normalises legacy records.
 * Older versions of the app stored plaintext `password` values instead of
 * `passwordHash`.  To avoid the "Illegal arguments: string, undefined" error
 * we automatically convert those entries to hashes when the file is loaded.
 * The file is rewritten once the migration is performed.
 */
export const readUsers = (): User[] => {
  const raw = readJson<any[]>(USERS_FILE, []);
  let changed = false;
  const users: User[] = raw.map(u => {
    // If there's an old `password` field, hash it and delete it.
    if (!u.passwordHash && typeof u.password === 'string') {
      u.passwordHash = bcrypt.hashSync(u.password, 12);
      delete u.password;
      changed = true;
    }
    return u as User;
  });
  if (changed) writeJson(USERS_FILE, users);
  return users;
};

export const writeUsers      = (d: User[]) => writeJson(USERS_FILE, d);

export const readLeaderboard = () => readJson<LeaderboardEntry[]>(LEADERBOARD_FILE, []);
export const writeLeaderboard= (d: LeaderboardEntry[]) => writeJson(LEADERBOARD_FILE, d);

export const readTitles      = () => readJson<Title[]>(TITLES_FILE, []);
