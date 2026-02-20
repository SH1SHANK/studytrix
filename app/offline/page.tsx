import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">You are offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Studytrix is running in offline mode. Reconnect to refresh live content.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
