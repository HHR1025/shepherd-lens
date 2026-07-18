export default function Home() {
  return (
    <main className="flex min-h-screen bg-[#101010] px-6 py-16 text-stone-100">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm text-stone-500">Shepherd Lens</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">
          Recommendation environment research prototype
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-stone-400">
          The working product is a local-first Chrome extension that observes visible YouTube
          recommendations, calculates transparent heuristic signals, and stores bounded history
          for drift analysis.
        </p>

        <section className="mt-12 border-t border-white/10 pt-8">
          <h2 className="text-sm font-medium text-stone-300">Current boundary</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Shepherd Lens sees only the recommendations currently visible in the page DOM. It does
            not access YouTube&apos;s internal ranking model and does not determine truth,
            psychology, or intent.
          </p>
        </section>

        <div className="mt-10 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            ["Runtime", "Chrome MV3"],
            ["Analysis", "Local heuristics"],
            ["Storage", "Browser local"],
          ].map(([label, value]) => (
            <div className="bg-[#101010] px-5 py-4" key={label}>
              <p className="text-xs text-stone-600">{label}</p>
              <p className="mt-2 text-sm font-medium text-stone-300">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
