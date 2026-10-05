"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { TeletextEdition, TeletextStory } from "@/lib/types";

const languageOptions = [
  { value: "en", label: "EN" },
  { value: "sv", label: "SV" },
  { value: "de", label: "DE" },
  { value: "es", label: "ES" },
  { value: "fr", label: "FR" }
];

const ui: Record<string, {
  news: string;
  world: string;
  tech: string;
  business: string;
  search: string;
  index: string;
  searchTitle: string;
  searchPrompt: string;
  searchPlaceholder: string;
  searchButton: string;
  searchHint: string;
  share: string;
  copied: string;
  latest: string;
  sources: string;
  updated: string;
  liveEdition: string;
}> = {
  en: {
    news: "News", world: "World", tech: "Tech", business: "Business", search: "Search", index: "Index",
    searchTitle: "SEARCH", searchPrompt: "What do you want the latest on?", searchPlaceholder: "OpenAI",
    searchButton: "SEARCH", searchHint: "Searches X + verifies important claims",
    share: "Share", copied: "Copied", latest: "Latest", sources: "Sources", updated: "Updated", liveEdition: "LIVE EDITION"
  },
  sv: {
    news: "Nyheter", world: "Världen", tech: "Teknik", business: "Ekonomi", search: "Sök", index: "Innehåll",
    searchTitle: "SÖK", searchPrompt: "Vad vill du ha det senaste om?", searchPlaceholder: "OpenAI",
    searchButton: "SÖK", searchHint: "Söker på X + verifierar viktiga uppgifter",
    share: "Dela", copied: "Kopierad", latest: "Senaste", sources: "Källor", updated: "Uppdaterad", liveEdition: "LIVE"
  },
  de: {
    news: "News", world: "Welt", tech: "Tech", business: "Wirtschaft", search: "Suche", index: "Inhalt",
    searchTitle: "SUCHE", searchPrompt: "Worüber willst du das Neueste?", searchPlaceholder: "OpenAI",
    searchButton: "SUCHEN", searchHint: "Durchsucht X + prüft wichtige Behauptungen",
    share: "Teilen", copied: "Kopiert", latest: "Aktuell", sources: "Quellen", updated: "Aktualisiert", liveEdition: "LIVE-AUSGABE"
  },
  es: {
    news: "Noticias", world: "Mundo", tech: "Tecno", business: "Economía", search: "Buscar", index: "Índice",
    searchTitle: "BUSCAR", searchPrompt: "¿Sobre qué quieres lo último?", searchPlaceholder: "OpenAI",
    searchButton: "BUSCAR", searchHint: "Busca en X + verifica afirmaciones importantes",
    share: "Compartir", copied: "Copiado", latest: "Último", sources: "Fuentes", updated: "Actualizado", liveEdition: "EDICIÓN EN VIVO"
  },
  fr: {
    news: "Actu", world: "Monde", tech: "Tech", business: "Économie", search: "Recherche", index: "Index",
    searchTitle: "RECHERCHE", searchPrompt: "Sur quoi voulez-vous les dernières infos ?", searchPlaceholder: "OpenAI",
    searchButton: "CHERCHER", searchHint: "Recherche X + vérifie les affirmations importantes",
    share: "Partager", copied: "Copié", latest: "Dernier", sources: "Sources", updated: "Mis à jour", liveEdition: "ÉDITION EN DIRECT"
  }
};

function compactTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function matchesSection(story: TeletextStory, section: number) {
  const category = story.category.toUpperCase();
  if (section === 200) return /(WORLD|POLIT|INTERN|EUROPE|WAR|GLOBAL|VÄRLD|MONDE|WELT|MUNDO)/.test(category);
  if (section === 300) return /(TECH|SCIENCE|AI|DIGITAL|SPACE|TEKNIK|WISSEN|CIENCIA)/.test(category);
  if (section === 400) return /(BUSINESS|MARKET|ECON|FINANCE|COMPANY|EKONOM|WIRTSCHAFT|ECONOM)/.test(category);
  return true;
}

function SectionIndex({
  title,
  stories,
  onNavigate,
  strings,
  searchMode = false
}: {
  title: string;
  stories: TeletextStory[];
  onNavigate: (page: number) => void;
  strings: (typeof ui)["en"];
  searchMode?: boolean;
}) {
  return (
    <div className="teletext-page" aria-label={title}>
      <div className="tt-blue-title">{title}</div>
      <div className="tt-index">
        {stories.length ? (
          stories.slice(0, 12).map((story) => (
            <button className="tt-index-row" key={story.page} onClick={() => onNavigate(story.page)}>
              <span className="tt-index-title">{story.headline}</span>
              <span className="tt-dots" aria-hidden="true">··············</span>
              <span className="tt-page-no">{story.page}</span>
            </button>
          ))
        ) : (
          <p className="tt-empty">—</p>
        )}
      </div>
      <div className="tt-bottom-strip">
        {searchMode ? (
          <>
            <button onClick={() => onNavigate(900)}>{strings.search} 900</button>
            <button onClick={() => onNavigate(100)}>{strings.news} 100</button>
            <button onClick={() => onNavigate(700)}>{strings.index} 700</button>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate(200)}>{strings.world} 200</button>
            <button onClick={() => onNavigate(300)}>{strings.tech} 300</button>
            <button onClick={() => onNavigate(700)}>{strings.index} 700</button>
          </>
        )}
      </div>
    </div>
  );
}

function SearchPage({
  strings,
  value,
  onChange,
  onSubmit
}: {
  strings: (typeof ui)["en"];
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="teletext-page search-page" aria-label={strings.searchTitle}>
      <div className="tt-blue-title">{strings.searchTitle}</div>
      <p className="search-prompt">{strings.searchPrompt}</p>
      <form
        className="tt-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <span aria-hidden="true">&gt;</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 120))}
          placeholder={strings.searchPlaceholder}
          maxLength={120}
          autoComplete="off"
          aria-label={strings.searchPrompt}
        />
        <button type="submit">{strings.searchButton}</button>
      </form>
      <p className="search-hint">{strings.searchHint}</p>
      <div className="tt-search-spacer" />
      <div className="tt-bottom-strip">
        <span>{strings.news} 100</span>
        <span>{strings.search} 900</span>
        <span>{strings.index} 700</span>
      </div>
    </div>
  );
}

function StoryPage({
  story,
  onNavigate,
  searchMode,
  strings
}: {
  story: TeletextStory;
  onNavigate: (page: number) => void;
  searchMode: boolean;
  strings: (typeof ui)["en"];
}) {
  return (
    <div className="teletext-page" aria-label={story.headline}>
      <h1 className="tt-headline">{story.headline}</h1>
      <div className="tt-copy">
        {story.paragraphs.map((paragraph, index) => (
          <p className={story.highlightParagraph === index ? "tt-highlight" : ""} key={index}>
            {paragraph}
          </p>
        ))}
      </div>
      <div className="tt-bottom-strip">
        {searchMode ? (
          <>
            <button onClick={() => onNavigate(900)}>{strings.search} 900</button>
            <button onClick={() => onNavigate(100)}>{strings.news} 100</button>
            <button onClick={() => onNavigate(700)}>{strings.index} 700</button>
          </>
        ) : (
          <>
            <button onClick={() => onNavigate(100)}>{strings.news} 100</button>
            <button onClick={() => onNavigate(200)}>{strings.world} 200</button>
            <button onClick={() => onNavigate(700)}>{strings.index} 700</button>
          </>
        )}
      </div>
    </div>
  );
}

function liveHref(page: number, language: string, query: string) {
  const params = new URLSearchParams();
  params.set("lang", language);
  if (page >= 900 && page < 1000 && query) params.set("q", query);
  return `/${page}?${params.toString()}`;
}

function WebArticle({
  story,
  edition,
  language,
  query,
  strings
}: {
  story?: TeletextStory;
  edition: TeletextEdition;
  language: string;
  query: string;
  strings: (typeof ui)["en"];
}) {
  if (!story) {
    return (
      <article className="web-article">
        <p className="web-kicker">{strings.liveEdition}</p>
        <h1>{query || "What matters now"}</h1>
        <p>{edition.basis}</p>
        <ol>
          {edition.stories.map((item) => (
            <li key={item.page}>
              <a href={liveHref(item.page, language, query)}>{item.headline}</a>
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
          <li key={index}>
            {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}
          </li>
        ))}
      </ul>
      {story.sourcePosts?.length ? (
        <>
          <h2>X</h2>
          <ul>
            {story.sourcePosts.map((post) => (
              <li key={post.id}>
                {post.url ? <a href={post.url} target="_blank" rel="noreferrer">{post.text}</a> : post.text}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}

export default function TeletextApp({
  initialPage,
  edition,
  initialQuery = "",
  initialLanguage = "en",
  isSnapshot = false
}: {
  initialPage: number;
  edition: TeletextEdition;
  initialQuery?: string;
  initialLanguage?: string;
  isSnapshot?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<"txt" | "web">("txt");
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [language, setLanguage] = useState(initialLanguage);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [shareStatus, setShareStatus] = useState("");
  const touchStart = useRef<number | null>(null);
  const query = initialQuery;
  const strings = ui[language] || ui.en;
  const story = edition.stories.find((item) => item.page === currentPage);
  const searchMode = currentPage >= 900 && currentPage < 1000;

  const sectionTabs = [
    { page: 100, label: strings.news },
    { page: 200, label: strings.world },
    { page: 300, label: strings.tech },
    { page: 400, label: strings.business },
    { page: 900, label: strings.search },
    { page: 700, label: strings.index }
  ];

  const activeSection =
    currentPage >= 100 && currentPage < 200 ? 100 :
    currentPage >= 200 && currentPage < 300 ? 200 :
    currentPage >= 300 && currentPage < 400 ? 300 :
    currentPage >= 400 && currentPage < 500 ? 400 :
    currentPage >= 900 && currentPage < 1000 ? 900 :
    currentPage === 700 ? 700 : 100;

  const pageContent = useMemo(() => {
    if (currentPage === 900 && !query) return { kind: "search" as const };
    if (currentPage === 900 && query) {
      const title = `${strings.searchTitle}: ${query}`.slice(0, 34);
      return { kind: "index" as const, title, stories: edition.stories, searchMode: true };
    }
    if (currentPage === 100) return { kind: "index" as const, title: strings.news.toUpperCase(), stories: edition.stories, searchMode: false };
    if (currentPage === 200) return { kind: "index" as const, title: strings.world.toUpperCase(), stories: edition.stories.filter((s) => matchesSection(s, 200)), searchMode: false };
    if (currentPage === 300) return { kind: "index" as const, title: strings.tech.toUpperCase(), stories: edition.stories.filter((s) => matchesSection(s, 300)), searchMode: false };
    if (currentPage === 400) return { kind: "index" as const, title: strings.business.toUpperCase(), stories: edition.stories.filter((s) => matchesSection(s, 400)), searchMode: false };
    if (currentPage === 700) return { kind: "index" as const, title: strings.index.toUpperCase(), stories: edition.stories, searchMode: false };
    if (story) return { kind: "story" as const, story };
    return { kind: "index" as const, title: "PAGE NOT FOUND", stories: [], searchMode };
  }, [currentPage, edition.stories, query, story, strings]);

  const navigablePages = useMemo(() => {
    if (query) return [900, ...edition.stories.map((s) => s.page)];
    return Array.from(new Set([100, ...edition.stories.map((s) => s.page), 200, 300, 400, 700, 900])).sort((a, b) => a - b);
  }, [edition.stories, query]);

  const navigate = (page: number) => {
    setPageInput(String(page));
    if (isSnapshot) {
      setCurrentPage(page);
      return;
    }
    router.push(liveHref(page, language, query));
  };

  const step = (direction: -1 | 1) => {
    const index = navigablePages.indexOf(currentPage);
    if (index === -1) return navigate(query ? 900 : 100);
    const next = navigablePages[(index + direction + navigablePages.length) % navigablePages.length];
    navigate(next);
  };

  const runSearch = () => {
    const cleaned = searchInput.trim().replace(/\s+/g, " ").slice(0, 120);
    if (!cleaned) return;
    router.push(liveHref(900, language, cleaned));
  };

  const changeLanguage = (nextLanguage: string) => {
    setLanguage(nextLanguage);
    router.push(liveHref(currentPage, nextLanguage, query));
  };

  const shareEdition = async () => {
    try {
      let url = window.location.href;
      if (!isSnapshot) {
        const response = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: currentPage,
            language,
            query,
            edition
          })
        });
        if (!response.ok) throw new Error("Share failed");
        const data = await response.json() as { path: string };
        url = window.location.origin + data.path;
      }

      if (navigator.share) {
        await navigator.share({
          title: query ? `Teletext: ${query}` : "Teletext",
          url
        });
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
    setSearchInput(initialQuery);
  }, [initialPage, initialLanguage, initialQuery, pathname]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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

  const latestUrl = liveHref(currentPage, language, query);

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
          <select
            className="language-select"
            value={language}
            onChange={(event) => changeLanguage(event.target.value)}
            aria-label="Language"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </nav>
      </header>

      <div
        className="screen-wrap"
        onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const end = event.changedTouches[0]?.clientX ?? touchStart.current;
          const delta = end - touchStart.current;
          touchStart.current = null;
          if (Math.abs(delta) > 60) step(delta > 0 ? -1 : 1);
        }}
      >
        {mode === "txt" ? (
          pageContent.kind === "search" ? (
            <SearchPage strings={strings} value={searchInput} onChange={setSearchInput} onSubmit={runSearch} />
          ) : pageContent.kind === "story" ? (
            <StoryPage story={pageContent.story} onNavigate={navigate} searchMode={searchMode} strings={strings} />
          ) : (
            <SectionIndex title={pageContent.title} stories={pageContent.stories} onNavigate={navigate} strings={strings} searchMode={pageContent.searchMode} />
          )
        ) : (
          <WebArticle story={story} edition={edition} language={language} query={query} strings={strings} />
        )}
      </div>

      <div className="mode-toggle" role="group" aria-label="Display mode">
        <button className={mode === "txt" ? "selected" : ""} onClick={() => setMode("txt")}>TV</button>
        <button className={mode === "web" ? "selected" : ""} onClick={() => setMode("web")}>Web</button>
      </div>

      <footer className="site-footer">
        <div className="footer-logo">txt</div>
        <div className="footer-links">
          {isSnapshot ? (
            <>
              <a href={latestUrl}>{strings.latest}</a>
              <span>|</span>
            </>
          ) : null}
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
          <input
            aria-label="Page number"
            inputMode="numeric"
            maxLength={3}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value.replace(/\D/g, "").slice(0, 3))}
          />
        </form>
        <button className="dock-arrow" onClick={() => step(1)} aria-label="Next page">›</button>
      </div>
    </main>
  );
}
