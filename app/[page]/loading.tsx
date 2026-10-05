export default function Loading() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="brand">txt</div>
      </header>

      <section className="quick-controls loading-controls" aria-hidden="true">
        <div className="quick-search">
          <span className="loading-label">SEARCH</span>
          <span className="quick-prompt">&gt;</span>
          <div className="loading-input" />
          <div className="loading-button">...</div>
        </div>
        <div className="quick-language">
          <span>LANG</span>
          <div className="loading-lang">--</div>
        </div>
      </section>

      <div className="search-progress" role="status" aria-live="polite">
        <span className="search-progress-dot" aria-hidden="true">■</span>
        SEARCHING X…
      </div>

      <div className="screen-wrap">
        <div className="teletext-page">
          <div className="tt-blue-title">PLEASE WAIT</div>
          <p className="loading-copy">Reading the latest conversation on X…</p>
          <p className="loading-copy dim">Verifying important claims and building your Teletext pages.</p>
        </div>
      </div>
    </main>
  );
}
