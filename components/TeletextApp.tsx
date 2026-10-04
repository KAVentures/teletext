"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { TeletextEdition, TeletextStory } from "@/lib/types";

const sectionTabs = [
  { page: 100, label: "News" },
  { page: 200, label: "World" },
  { page: 300, label: "Tech" },
  { page: 400, label: "Business" },
  { page: 700, label: "Index" }
];

function compactTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function compactDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(iso)).toUpperCase();
}

function matchesSection(story: TeletextStory, section: number) {
  const category = story.category.toUpperCase();
  if (section === 200) return /(WORLD|POLIT|INTERN|EUROPE|WAR|GLOBAL)/.test(category);
  if (section === 300) return /(TECH|SCIENCE|AI|DIGITAL|SPACE)/.test(category);
  if (section === 400) return /(BUSINESS|MARKET|ECON|FINANCE|COMPANY)/.test(category);
  return true;
}

function SectionIndex({
  page,
  title,
  stories,
  updatedAt,
  onNavigate
}: {
  page: number;
  title: string;
  stories: TeletextStory[];
  updatedAt: string;
  onNavigate: (page: number) => void;
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
          <p className="tt-empty">No stories in this section right now.</p>
        )}
      </div>
      <div className="tt-bottom-strip">
        <button onClick={() => onNavigate(200)}>World 200</button>
        <button onClick={() => onNavigate(300)}>Tech 300</button>
        <button onClick={() => onNavigate(700)}>Index 700</button>
      </div>
    </div>
  );
}

function StoryPage({
  story,
  updatedAt,
  onNavigate
}: {
  story: TeletextStory;
  updatedAt: string;
  onNavigate: (page: number) => void;
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
        <button onClick={() => onNavigate(100)}>News 100</button>
        <button onClick={() => onNavigate(200)}>World 200</button>
        <button onClick={() => onNavigate(700)}>Index 700</button>
      </div>
    </div>
  );
}

function WebArticle({ story, edition }: { story?: TeletextStory; edition: TeletextEdition }) {
  if (!story) {
    return (
      <article className="web-article">
        <p className="web-kicker">LIVE EDITION</p>
        <h1>What matters now</h1>
        <p>{edition.basis}</p>
        <ol>
          {edition.stories.map((item) => (
            <li key={item.page}><a href={`/${item.page}`}>{item.headline}</a></li>
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
      <h2>Sources</h2>
      <ul>
        {story.sources.map((source, index) => (
          <li key={index}>
            {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}
          </li>
        ))}
      </ul>
      {story.sourcePosts?.length ? (
        <>
          <h2>From X</h2>
          <ul>
            {story.sourcePosts.map((post) => (
              <li key={post.id}>
                {post.url ? <a href={post.url} target="_blank" rel="noreferrer">@{post.username || "X"}: {post.text}</a> : post.text}
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
  edition
}: {
  initialPage: number;
  edition: TeletextEdition;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<"txt" | "web">("txt");
  const [pageInput, setPageInput] = useState(String(initialPage));
  const touchStart = useRef<number | null>(null);
  const story = edition.stories.find((item) => item.page === initialPage);
  const activeSection =
    initialPage >= 100 && initialPage < 200 ? 100 :
    initialPage >= 200 && initialPage < 300 ? 200 :
    initialPage >= 300 && initialPage < 400 ? 300 :
    initialPage >= 400 && initialPage < 500 ? 400 :
    initialPage === 700 ? 700 : 100;

  const pageContent = useMemo(() => {
    if (initialPage === 100) return { kind: "index" as const, title: "NEWS", stories: edition.stories };
    if (initialPage === 200) return { kind: "index" as const, title: "WORLD", stories: edition.stories.filter((s) => matchesSection(s, 200)) };
    if (initialPage === 300) return { kind: "index" as const, title: "TECH", stories: edition.stories.filter((s) => matchesSection(s, 300)) };
    if (initialPage === 400) return { kind: "index" as const, title: "BUSINESS", stories: edition.stories.filter((s) => matchesSection(s, 400)) };
    if (initialPage === 700) return { kind: "index" as const, title: "INDEX", stories: edition.stories };
    if (story) return { kind: "story" as const, story };
    return { kind: "index" as const, title: "PAGE NOT FOUND", stories: [] };
  }, [edition.stories, initialPage, story]);

  const navigablePages = useMemo(
    () => Array.from(new Set([100, ...edition.stories.map((s) => s.page), 200, 300, 400, 700])).sort((a, b) => a - b),
    [edition.stories]
  );

  const navigate = (page: number) => {
    setPageInput(String(page));
    router.push(`/${page}`);
  };

  const step = (direction: -1 | 1) => {
    const index = navigablePages.indexOf(initialPage);
    if (index === -1) return navigate(100);
    const next = navigablePages[(index + direction + navigablePages.length) % navigablePages.length];
    navigate(next);
  };

  useEffect(() => setPageInput(String(initialPage)), [initialPage, pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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
          pageContent.kind === "story" ? (
            <StoryPage story={pageContent.story} updatedAt={edition.updatedAt} onNavigate={navigate} />
          ) : (
            <SectionIndex page={initialPage} title={pageContent.title} stories={pageContent.stories} updatedAt={edition.updatedAt} onNavigate={navigate} />
          )
        ) : (
          <WebArticle story={story} edition={edition} />
        )}
      </div>

      <div className="mode-toggle" role="group" aria-label="Display mode">
        <button className={mode === "txt" ? "selected" : ""} onClick={() => setMode("txt")}>TV</button>
        <button className={mode === "web" ? "selected" : ""} onClick={() => setMode("web")}>Web</button>
      </div>

      <footer className="site-footer">
        <div className="footer-logo">txt</div>
        <div className="footer-links">
          <a href="https://github.com/KAVentures/teletext" target="_blank" rel="noreferrer">About</a>
          <span>|</span>
          <button onClick={() => setMode("web")}>Sources</button>
          <span>|</span>
          <span>Updated {compactTime(edition.updatedAt)}</span>
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
