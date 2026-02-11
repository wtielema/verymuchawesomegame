import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <main className="flex w-full max-w-md flex-col items-center gap-12 text-center">
        {/* Title */}
        <div className="flex flex-col items-center gap-4">
          <h1
            className="glow-green text-6xl font-bold tracking-[0.3em] sm:text-7xl"
            style={{ color: 'var(--accent)' }}
          >
            MERIDIAN
          </h1>
          <p
            className="text-lg tracking-widest uppercase"
            style={{ color: 'var(--accent-dim)' }}
          >
            Survive. Escape. Betray.
          </p>
        </div>

        {/* Decorative line */}
        <div
          className="h-px w-48"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--accent), transparent)',
          }}
        />

        {/* Action buttons */}
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/create"
            className="animate-pulse-glow flex h-14 flex-1 items-center justify-center rounded-lg border font-semibold tracking-wider uppercase transition-all duration-200 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
              backgroundColor: 'rgba(0, 255, 136, 0.05)',
            }}
          >
            Create Game
          </Link>
          <Link
            href="/join"
            className="flex h-14 flex-1 items-center justify-center rounded-lg border font-semibold tracking-wider uppercase transition-all duration-200 hover:scale-[1.02]"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
              backgroundColor: 'var(--surface)',
            }}
          >
            Join Game
          </Link>
        </div>

        {/* Footer hint */}
        <p className="text-xs" style={{ color: 'var(--border)' }}>
          A turn-based survival game for 3-20 players
        </p>
      </main>
    </div>
  );
}
