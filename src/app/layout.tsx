// Minimal root layout — the game is served as a static HTML file from /public,
// so this layout is only needed to satisfy Next.js App Router requirements.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
