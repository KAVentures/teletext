import { notFound, redirect } from "next/navigation";
import {
  getGlobalEdition,
  getMyXEdition,
  normalizeHandles,
  normalizeLanguage
} from "@/lib/edition";
import TeletextApp from "@/components/TeletextApp";

export const revalidate = 60;

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{
    lang?: string | string[];
    u?: string | string[];
    q?: string | string[];
  }>;
}) {
  const { page } = await params;
  if (!/^\d{3}$/.test(page)) notFound();

  const numericPage = Number(page);
  const queryParams = await searchParams;
  const rawLanguage = Array.isArray(queryParams.lang) ? queryParams.lang[0] : queryParams.lang;
  const rawHandles = Array.isArray(queryParams.u) ? queryParams.u[0] : queryParams.u;
  const language = normalizeLanguage(rawLanguage);
  const handles = normalizeHandles(rawHandles);

  // Old free-text search links now land on My X rather than triggering paid search.
  if (numericPage >= 900 && numericPage < 1000) {
    const suffix = handles.length ? `&u=${encodeURIComponent(handles.join(","))}` : "";
    redirect(`/800?lang=${encodeURIComponent(language)}${suffix}`);
  }

  const isMyXPage = numericPage >= 800 && numericPage < 900;

  if (numericPage > 800 && numericPage < 900 && !handles.length) {
    redirect("/800?lang=" + encodeURIComponent(language));
  }

  const edition = isMyXPage
    ? await getMyXEdition({ handles, language })
    : await getGlobalEdition(language);

  return (
    <TeletextApp
      initialPage={numericPage}
      edition={edition}
      initialLanguage={language}
      initialHandles={handles}
    />
  );
}
