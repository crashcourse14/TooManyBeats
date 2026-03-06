import { redirect } from 'next/navigation';

// The actual game is index.html served from /public.
// Next.js serves files in /public at the root, but its own page.tsx
// takes precedence for "/". We redirect so hitting "/" serves the game.
export default function Home() {
  redirect('/index.html');
}
