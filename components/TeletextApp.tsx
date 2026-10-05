"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeletextEdition, TeletextStory } from "@/lib/types";

const languageOptions = [
  { value: "en", label: "EN" },
  { value: "sv", label: "SV" },
  { value: "de", label: "DE" },
  { value: "es", label: "ES" },
  { value: "fr", label: "FR" }
];

const ui: Record<string, {
  news: string; world: string; tech: string; business: string; myX: string; index: string;
  addProfile: string; add: string; profilePlaceholder: string; maxProfiles: string;
  myXPrompt: string; share: string; copied: string; latest: string; sources: string;
  updated: string; liveEdition: string; originalLanguage: string; remove: string;
}> = {
  en: {
    news: "News", world: "World", tech: "Tech", business: "Business", myX: "My X", index: "Index",
    addProfile: "Add X profile", add: "ADD", profilePlaceholder: "@sama", maxProfiles: "Up to 5 profiles · reused for 7 days",
    myXPrompt: "Choose X profiles and turn their recent posts into your own Teletext.",
    share: "Share", copied: "Copied", latest: "Latest", sources: "Sources", updated: "Updated",
    liveEdition: "LIVE EDITION", originalLanguage: "Posts stay in their original language.", remove: "Remove"
  },
  sv: {
    news: "Nyheter", world: "Världen", tech: "Teknik", business: "Ekonomi", myX: "Mitt X", index: "Innehåll",
    addProfile: "Lägg till X-profil", add: "LÄGG TILL", profilePlaceholder: "@sama", maxProfiles: "Upp till 5 profiler · återanvänds i 7 dagar",
    myXPrompt: "Välj X-profiler och gör deras senaste inlägg till din egen Text-TV.",
    share: "Dela", copied: "Kopierad", latest: "Senaste", sources: "Källor", updated: "Uppdaterad",
    liveEdition: "LIVE", originalLanguage: "Inläggen visas på originalspråket.", remove: "Ta bort"
  },
  de: {
    news: "News", world: "Welt", tech: "Tech", business: "Wirtschaft", myX: "Mein X", index: "Inhalt",
    addProfile: "X-Profil hinzufügen", add: "HINZU", profilePlaceholder: "@sama", maxProfiles: "Bis zu 5 Profile · 7 Tage wiederverwendet",
    myXPrompt: "Wähle X-Profile und mache aus ihren letzten Posts dein eigenes Teletext.",
    share: "Teilen", copied: "Kopiert", latest: "Aktuell", sources: "Quellen", updated: "Aktualisiert",
    liveEdition: "LIVE-AUSGABE", originalLanguage: "Posts bleiben in ihrer Originalsprache.", remove: "Entfernen"
  },
  es: {
    news: "Noticias", world: "Mundo", tech: "Tecno", business: "Economía", myX: "Mi X", index: "Índice",
    addProfile: "Añadir perfil X", add: "AÑADIR", profilePlaceholder: "@sama", maxProfiles: "Hasta 5 perfiles · reutilizados 7 días",
    myXPrompt: "Elige perfiles de X y convierte sus publicaciones recientes en tu Teletext.",
    share: "Compartir", copied: "Copiado", latest: "Último", sources: "Fuentes", updated: "Actualizado",
    liveEdition: "EDICIÓN EN VIVO", originalLanguage: "Las publicaciones conservan su idioma original.", remove: "Quitar"
  },
  fr: {
    news: "Actu", world: "Monde", tech: "Tech", business: "Économie", myX: "Mon X", index: "Index",
    addProfile: "Ajouter un profil X", add: "AJOUTER", profilePlaceholder: "@sama", maxProfiles: "Jusqu’à 5 profils · réutilisés 7 jours",
    myXPrompt: "Choisissez des profils X et transformez leurs posts récents en votre Teletext.",
    share: "Partager", copied: "Copié", latest: "Dernier", sources: "Sources", updated: "Mis à jour",
    liveEdition: "ÉDITION EN DIRECT", originalLanguage: "Les posts restent dans leur langue d’origine.", remove: "Retirer"
  }
};

function compactTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function normalizeHandle(value: string) {
  const handle = value.trim().replace(/^@+/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle.toLowerCase() : "";
}

function matchesSection(story: TeletextStory, section: number) {
  const category = story.category.toUpperCase();
  if (section === 200) return /(WORLD|POLIT|INTERN|EUROPE|WAR|GLOBAL|VÄRLD|MONDE|WELT|MUNDO)/.test(category);
  if (section === 300) return /(TECH|SCIENCE|AI|DIGITAL|SPACE|TEKNIK|WISSEN|CIENCIA)/.test(category);
  if (section === 400) return /(BUSINESS|MARKET|ECON|FINANCE|COMPANY|EKONOM|WIRTSCHAFT|ECONOM)/.test(category);
  return true;
}

function liveHref(page: number, language: string, handles: string[]) {
  const params = new URLSearchParams();
  params.set("lang", language);
  if (page >= 800 && page < 600 && handles.length) params.set("u", handles.join(","));
  return `/${page}?${params.toString()}`;
}

function SectionIndex({
  title, stories, onNavigate, strings, myXMode = false, emptyMessage = "—"
}: {
  title: string; stories: TeletextStory[]; onNavigate: (page: number) => void;
  strings: (typeof ui)["en"]; myXMode?: boolean; emptyMessage?: string;
}) {
  return (
    <div className="teletext-page" aria-label={title}>
      <div className="tt-blue-title">{title}</div>
      <div className="tt-index">
        {stories.length ? stories.slice(0, 12).map((story) => (
          <button className="tt-index-row" key={story.page} onClick={() => onNavigate(story.page)}>
            <span className="tt-index-title">{story.headline}</span>
            <span className="tt-dots" aria-hidden="true">··············</span>
            <span className="tt-page-no">{story.page}</span>
          </button>
        )) : <p className="tt-empty">{emptyMessage}</p>}
      </div>
      <div className="tt-bottom-strip">
        {myXMode ? (
          <>
            <button onClick={() => onNavigate(500)}>{strings.myX} 800</button>
            <button onClick={() => onNavigate(100)}>{strings.news} 100</button>
            <button onClick={() => onNavigate(700)}>{strings.index} 700</button>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate(200)}>{strings.world} 200</button>
            <button onClick={() => onNavigate(300)}>{strings.tech} 300</button>
            <button onClick={() => onNavigate(500)}>{strings.myX} 800</button>
          </>
        )}
      </div>
    </div>
  );
}

function MyXSetup({
  strings, handles, onRemove
}: {
  strings: (typeof ui)["en"]; handles: string[]; onRemove: (handle: string) => void;
}) {
  return (
    <div className="teletext-page myx-page">
      <div className="tt-blue-title">{strings.myX.toUpperCase()} 500</div>
      <p className="search-prompt">{strings.myXPrompt}</p>
      <p className="search-hint">{strings.maxProfiles}</p>
      <p className="search-hint">{strings.originalLanguage}</p>
      {handles.length ? (
        <div className="myx-handles">
          {handles.map((handle) => (
            <div className="myx-handle" key={handle}>
              <span>@{handle}</span>
              <button onClick={() => onRemove(handle)}>{strings.remove}</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="tt-empty">+ @username</p>
      )}
      <div className="tt-search-spacer" />
      <div className="tt-bottom-strip">
        <span>{strings.news} 100</span>
        <span>{strings.myX} 800</span>
        <span>{strings.index} 700</span>
      </div>
    </div>
  );
}

function StoryPage({
  story, onNavigate, myXMode, strings
}: {
  story: TeletextStory; onNavigate: (page: number) => void; myXMode: boolean; strings: (typeof ui)["en"];
}) {
  const exactXPosts = story.sourcePosts || [];
  const sourceItems = exactXPosts.length
    ? exactXPosts.map((post) => ({
        key: post.id,
        label: post.username ? `@${post.username}` : "X",
        detail: post.text,
        url: post.url
      }))
    : story.sources.map((source, index) => ({
        key: String(index), label: source.label, detail: source.label, url: source.url
      }));

  return (
    <div className="teletext-page" aria-label={story.headline}>
      <h1 className="tt-headline">{story.headline}</h1>
      <div className="tt-copy">
        {story.paragraphs.map((paragraph, index) => (
          <p className={story.highlightParagraph === index ? "tt-highlight" : ""} key={index}>{paragraph}</p>
        ))}
      </div>

      {sourceItems.length ? (
        <details className="tt-source-details">
          <summary>{strings.sources.toUpperCase()} ({sourceItems.length})</summary>
          <div className="tt-source-list">
            {sourceItems.map((source, index) => (
              <a key={source.key} href={source.url || "#"} target={source.url ? "_blank" : undefined}
                rel={source.url ? "noreferrer" : undefined} className={!source.url ? "disabled" : ""}>
                <span className="tt-source-number">{index + 1}</span>
                <span className="tt-source-label">{source.label}</span>
                <span className="tt-source-text">{source.detail}</span>
              </a>
            ))}
          </div>
        </details>
      ) : null}

      <div className="tt-bottom-strip">
        {myXMode ? (
          <>
            <button onClick={() => onNavigate(500)}>{strings.myX} 800</button>
            <button onClick={() => onNavigate(100)}>{strings.news} 100</button>
            <button onClick={() => onNavigate(700)}>{strings.index} 700</button>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate(100)}>{strings.news} 100</button>
            <button onClick={() => onNavigate(200)}>{strings.world} 200</button>
            <button onClick={() => onNavigate(500)}>{strings.myX} 800</button>
          </>
        )}
      </div>
    </div>
  );
}

function WebArticle({
  story, edition, language, handles, strings, onNavigate
}: {
  story?: TeletextStory; edition: TeletextEdition; language: string; handles: string[];
  strings: (typeof ui)["en"]; onNavigate: (page: number) => void;
}) {
  if (!story) {
    return (
      <article className="web-article">
        <p className="web-kicker">{strings.liveEdition}</p>
        <h1>{handles.length ? strings.myX : "What matters now"}</h1>
        <p>{edition.basis}</p>
        <ol>
          {edition.stories.map((item) => (
            <li key={item.page}>
              <a href={liveHref(item.page, language, handles)} onClick={(event) => {
                event.preventDefault();
                onNavigate(item.page);
              }}>{item.headline}</a>
            </li>
          ))}
        </ol>
      </article>
    );
  }

  return (
    <article className="web-article">
      <p className="web-kicker">{story.category} · PAGE {story.page}</p>
      <h1>{story.headline}</h1>
      {story.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <h2>{strings.sources}</h2>
      <ul>
        {story.sources.map((source, index) => (
          <li key={index}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}</li>
        ))}
      </ul>
    </article>
  );
}

export default function TeletextApp({
  initialPage,
  edition,
  initialLanguage = "en",
  initialHandles = [],
  isSnapshot = false
}: {
  initialPage: number;
  edition: TeletextEdition;
  initialLanguage?: string;
  initialHandles?: string[];
  isSnapshot?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"txt" | "web">("txt");
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [language, setLanguage] = useState(initialLanguage);
  const [handles, setHandles] = useState(initialHandles);
  const [handleInput, setHandleInput] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const touchStart = useRef<number | null>(null);
  const strings = ui[language] || ui.en;
  const story = edition.stories.find((item) => item.page === currentPage);
  const myXMode = currentPage >= 800 && currentPage < 600;
  const loadedEditionIsMyX = Boolean(edition.handles?.length || initialPage >= 800 && initialPage < 600);

  const sectionTabs = [
    { page: 100, label: strings.news },
    { page: 200, label: strings.world },
    { page: 300, label: strings.tech },
    { page: 400, label: strings.business },
    { page: 800, label: strings.myX },
    { page: 700, label: strings.index }
  ];

  const activeSection =
    currentPage >= 100 && currentPage < 200 ? 100 :
    currentPage >= 200 && currentPage < 300 ? 200 :
    currentPage >= 300 && currentPage < 400 ? 300 :
    currentPage >= 400 && currentPage < 500 ? 400 :
    currentPage >= 800 && currentPage < 600 ? 500 :
    currentPage === 700 ? 700 : 100;

  const pageContent = useMemo(() => {
    if (currentPage === 800 && !handles.length) return { kind: "myx-setup" as const };
    if (currentPage === 800) return { kind: "index" as const, title: strings.myX.toUpperCase(), stories: edition.stories, myXMode: true };
    if (currentPage === 100) return { kind: "index" as const, title: strings.news.toUpperCase(), stories: edition.stories, myXMode: false };
    if (currentPage === 200) return { kind: "index" as const, title: strings.world.toUpperCase(), stories: edition.stories.filter((s) => matchesSection(s, 200)), myXMode: false };
    if (currentPage === 300) return { kind: "index" as const, title: strings.tech.toUpperCase(), stories: edition.stories.filter((s) => matchesSection(s, 300)), myXMode: false };
    if (currentPage === 400) return { kind: "index" as const, title: strings.business.toUpperCase(), stories: edition.stories.filter((s) => matchesSection(s, 400)), myXMode: false };
    if (currentPage === 700) return { kind: "index" as const, title: strings.index.toUpperCase(), stories: edition.stories, myXMode: false };
    if (story) return { kind: "story" as const, story };
    return { kind: "index" as const, title: "PAGE NOT FOUND", stories: [], myXMode };
  }, [currentPage, edition.stories, handles.length, myXMode, story, strings]);

  const navigablePages = useMemo(() => {
    if (loadedEditionIsMyX) return [800, ...edition.stories.map((s) => s.page)];
    return Array.from(new Set([100, ...edition.stories.map((s) => s.page), 200, 300, 400, 500, 700])).sort((a, b) => a - b);
  }, [edition.stories, loadedEditionIsMyX]);

  const navigate = (page: number) => {
    setPageInput(String(page));
    const destinationMyX = page >= 800 && page < 600;
    const storyIsLoaded = edition.stories.some((item) => item.page === page);
    const sameEditionUtility =
      loadedEditionIsMyX ? page === 800 : [100, 200, 300, 400, 700].includes(page);
    const canUseLoadedEdition = isSnapshot || (destinationMyX === loadedEditionIsMyX && (storyIsLoaded || sameEditionUtility));

    if (canUseLoadedEdition) {
      setCurrentPage(page);
      if (!isSnapshot) window.history.pushState({ teletextPage: page }, "", liveHref(page, language, handles));
      return;
    }

    router.push(liveHref(page, language, handles));
  };

  const step = (direction: -1 | 1) => {
    const index = navigablePages.indexOf(currentPage);
    if (index === -1) return navigate(loadedEditionIsMyX ? 800 : 100);
    navigate(navigablePages[(index + direction + navigablePages.length) % navigablePages.length]);
  };

  const addHandle = () => {
    const handle = normalizeHandle(handleInput);
    if (!handle || handles.includes(handle) || handles.length >= 5 || busy) return;
    const next = [...handles, handle];
    setHandles(next);
    setHandleInput("");
    setBusy(true);
    localStorage.setItem("teletext-my-x-handles", JSON.stringify(next));
    router.push(liveHref(800, language, next));
  };

  const removeHandle = (handle: string) => {
    if (busy) return;
    const next = handles.filter((item) => item !== handle);
    setHandles(next);
    setBusy(true);
    localStorage.setItem("teletext-my-x-handles", JSON.stringify(next));
    router.push(liveHref(800, language, next));
  };

  const changeLanguage = (nextLanguage: string) => {
    if (nextLanguage === language || busy) return;
    setBusy(true);
    setLanguage(nextLanguage);
    router.push(liveHref(currentPage, nextLanguage, handles));
  };

  const shareEdition = async () => {
    try {
      let url = window.location.href;
      if (!isSnapshot) {
        const response = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: currentPage, language, handles, edition })
        });
        if (!response.ok) throw new Error("Share failed");
        const data = await response.json() as { path: string };
        url = window.location.origin + data.path;
      }

      if (navigator.share) {
        await navigator.share({ title: handles.length ? "My X · Teletext" : "Teletext", url });
        setShareStatus("");
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus(strings.copied);
        window.setTimeout(() => setShareStatus(""), 1800);
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setShareStatus("!");
    }
  };

  useEffect(() => {
    setCurrentPage(initialPage);
    setPageInput(String(initialPage));
    setLanguage(initialLanguage);
    setHandles(initialHandles);
    setBusy(false);
    if (initialHandles.length) localStorage.setItem("teletext-my-x-handles", JSON.stringify(initialHandles));
  }, [initialPage, initialLanguage, initialHandles.join(",")]);

  useEffect(() => {
    if (isSnapshot || initialHandles.length || initialPage !== 800) return;
    try {
      const saved = JSON.parse(localStorage.getItem("teletext-my-x-handles") || "[]");
      const restored = Array.isArray(saved) ? saved.map(String).map(normalizeHandle).filter(Boolean).slice(0, 5) : [];
      if (restored.length) router.replace(liveHref(800, initialLanguage, restored));
    } catch {}
  }, [initialHandles.length, initialLanguage, initialPage, isSnapshot, router]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/(\d{3})$/);
      if (!match) return;
      const page = Number(match[1]);
      const destinationMyX = page >= 800 && page < 600;
      const storyIsLoaded = edition.stories.some((item) => item.page === page);
      const utility = loadedEditionIsMyX ? page === 800 : [100, 200, 300, 400, 700].includes(page);
      if (isSnapshot || (destinationMyX === loadedEditionIsMyX && (storyIsLoaded || utility))) {
        setCurrentPage(page);
        setPageInput(String(page));
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [edition.stories, isSnapshot, loadedEditionIsMyX]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT") return;
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const latestUrl = liveHref(currentPage, language, handles);

  return (
    <main className="site-shell">
      <header className="site-header">
        <button className="brand" onClick={() => navigate(100)} aria-label="Teletext home">txt</button>
        <nav className="top-tabs" aria-label="Teletext sections">
          {sectionTabs.map((tab) => (
            <button key={tab.page} onClick={() => navigate(tab.page)} className={activeSection === tab.page ? "top-tab active" : "top-tab"}>
              <span>{tab.page}</span> <strong>{tab.label}</strong>
            </button>
          ))}
        </nav>
      </header>

      <section className="quick-controls" aria-label="My X and language">
        <form className="quick-search" onSubmit={(event) => { event.preventDefault(); addHandle(); }}>
          <label htmlFor="profile-add">{strings.addProfile}</label>
          <span className="quick-prompt" aria-hidden="true">&gt;</span>
          <input id="profile-add" value={handleInput}
            onChange={(event) => setHandleInput(event.target.value.slice(0, 16))}
            placeholder={strings.profilePlaceholder} maxLength={16} autoComplete="off" />
          <button type="submit" disabled={busy || !normalizeHandle(handleInput) || handles.length >= 5}>
            {busy ? "…" : strings.add}
          </button>
        </form>

        <label className="quick-language">
          <span>LANG</span>
          <select className="language-select" value={language}
            onChange={(event) => changeLanguage(event.target.value)} aria-label="Language" disabled={busy}>
            {languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </section>

      {busy ? (
        <div className="search-progress" role="status" aria-live="polite">
          <span className="search-progress-dot" aria-hidden="true">■</span>
          LOADING…
        </div>
      ) : null}

      <div className="screen-wrap"
        onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const end = event.changedTouches[0]?.clientX ?? touchStart.current;
          const delta = end - touchStart.current;
          touchStart.current = null;
          if (Math.abs(delta) > 60) step(delta > 0 ? -1 : 1);
        }}>
        {mode === "txt" ? (
          pageContent.kind === "myx-setup" ? (
            <MyXSetup strings={strings} handles={handles} onRemove={removeHandle} />
          ) : pageContent.kind === "story" ? (
            <StoryPage story={pageContent.story} onNavigate={navigate} myXMode={loadedEditionIsMyX} strings={strings} />
          ) : (
            <SectionIndex title={pageContent.title} stories={pageContent.stories} onNavigate={navigate}
              strings={strings} myXMode={pageContent.myXMode}
              emptyMessage={edition.mode === "error" ? edition.basis : "—"} />
          )
        ) : (
          <WebArticle story={story} edition={edition} language={language} handles={handles} strings={strings} onNavigate={navigate} />
        )}
      </div>

      <div className="mode-toggle" role="group" aria-label="Display mode">
        <button className={mode === "txt" ? "selected" : ""} onClick={() => setMode("txt")}>TV</button>
        <button className={mode === "web" ? "selected" : ""} onClick={() => setMode("web")}>Web</button>
      </div>

      <footer className="site-footer">
        <div className="footer-logo">txt</div>
        <div className="footer-links">
          {isSnapshot ? <><a href={latestUrl}>{strings.latest}</a><span>|</span></> : null}
          <button onClick={shareEdition}>{shareStatus || strings.share}</button>
          <span>|</span>
          <button onClick={() => setMode("web")}>{strings.sources}</button>
          <span>|</span>
          <span>{strings.updated} {compactTime(edition.updatedAt)}</span>
        </div>
      </footer>

      <div className="page-dock" aria-label="Page navigation">
        <button className="dock-arrow" onClick={() => step(-1)} aria-label="Previous page">‹</button>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (/^\d{3}$/.test(pageInput)) navigate(Number(pageInput));
        }}>
          <input aria-label="Page number" inputMode="numeric" maxLength={3} value={pageInput}
            onChange={(event) => setPageInput(event.target.value.replace(/\D/g, "").slice(0, 3))} />
        </form>
        <button className="dock-arrow" onClick={() => step(1)} aria-label="Next page">›</button>
      </div>
    </main>
  );
}
