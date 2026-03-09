/**
 * Too Many Beats — Supabase database helpers
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zkoibcpekzqvvgbijvtl.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Types ──────────────────────────────────────────────────────

export interface User {
  id?:            number;
  username:       string;
  password_hash:  string;
  active_title:   string | null;
  active_banner:  string | null;
  ship_color:     string | null | undefined;
  avatar_url:     string | null;
  xp:             number;
  titles:         string[];
  created_at:     string;
}

export interface LeaderboardEntry {
  id?:       number;
  name:      string;
  level:     string;
  score:     number;
  combo:     number;
  timestamp: string;
  title?:    string | null;
}

export interface Title {
  id:    string;
  label: string;
  class: string;
}

// ── Users ──────────────────────────────────────────────────────

export const readUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  if (error) throw error;
  return data || [];
};

export const createUser = async (user: Omit<User, 'id'>): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .insert(user);
  if (error) throw error;
};

export const updateUser = async (
  username: string,
  updates: Partial<Omit<User, 'id' | 'username'>>
): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('username', username);
  if (error) throw error;
};

// ── Leaderboard ────────────────────────────────────────────────

export const readLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const upsertLeaderboardEntry = async (
  entry: Omit<LeaderboardEntry, 'id' | 'title'>
): Promise<void> => {
  const { error } = await supabase
    .from('leaderboard')
    .upsert(
      {
        name:      entry.name,
        level:     entry.level,
        score:     entry.score,
        combo:     entry.combo,
        timestamp: entry.timestamp,
      },
      { onConflict: 'name,level', ignoreDuplicates: false }
    );
  if (error) throw error;
};

// ── Titles ─────────────────────────────────────────────────────

export const readTitles = async (): Promise<Title[]> => {
  const { data, error } = await supabase
    .from('titles')
    .select('*');
  if (error) throw error;
  return data || [];
};