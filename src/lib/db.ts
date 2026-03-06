/**
 * Too Many Beats — Supabase database helpers
 *
 * Uses Supabase for data storage, suitable for serverless deployments like Vercel.
 */

import { createClient } from '@supabase/supabase-js';

//I connected VERCEL to SUBABASE, uknown if I still need the url and key.

// ── Supabase Client ─────────────────────────────────────────────
const supabaseUrl = 'https://zkoibcpekzqvvgbijvtl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb2liY3Bla3pxdnZnYmlqdnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTg4MjEsImV4cCI6MjA4ODIzNDgyMX0.dOB7XXWTuyxX52kfKzJWp5leXETpQWk2GqtigDYcWXs';
export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Types ──────────────────────────────────────────────────────
export interface User {
  id?:         number;
  username:    string;
  password_hash: string;
  active_title: string | null;
  titles:      string[];   // unlocked title IDs
  created_at:  string;
}

export interface LeaderboardEntry {
  id?:       number;
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

// ── Typed convenience accessors ────────────────────────────────

export const readUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const writeUsers = async (users: User[]): Promise<void> => {
  // For simplicity, delete all and insert new (not ideal for production)
  const { error: deleteError } = await supabase.from('users').delete().neq('id', 0);
  if (deleteError) throw deleteError;
  if (users.length > 0) {
    const { error: insertError } = await supabase.from('users').insert(users);
    if (insertError) throw insertError;
  }
};

export const readLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const writeLeaderboard = async (entries: LeaderboardEntry[]): Promise<void> => {
  // Similar to users
  const { error: deleteError } = await supabase.from('leaderboard').delete().neq('id', 0);
  if (deleteError) throw deleteError;
  if (entries.length > 0) {
    const { error: insertError } = await supabase.from('leaderboard').insert(entries);
    if (insertError) throw insertError;
  }
};

export const readTitles = async (): Promise<Title[]> => {
  const { data, error } = await supabase
    .from('titles')
    .select('*')
    .order('id');
  if (error) throw error;
  return data || [];
};
