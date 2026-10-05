import { notFound, redirect } from "next/navigation";
import { getEdition, makeSearchShellEdition, normalizeLanguage, normalizeQuery } from "@/lib/edition";
import TeletextApp from "@/components/TeletextApp";

export const revalidate = 60;

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ q?: string | string[]; lang?: string | string[] }>;
}) {
  const { page } = await params;
  if (!/^\d{3}$/.test(page)) notFound();

  const numericPage = Number(page);
  const queryParams = await searchParams;
  const rawQuery = Array.isArray(queryParams.q) ? queryParams.q[0] : queryParams.q;
  const rawLanguage = Array.isArray(queryParams.lang) ? queryParams.lang[0] : queryParams.lang;
  const language = normalizeLanguage(rawLanguage);
  const isSearchPage = numericPage >= 900 && numericPage < 1000;
  const query = isSearchPage ? normalizeQuery(rawQuery) : "";

  if (numericPage > 900 && numericPage < 1000 && !query) {
    redirect("/900?lang=" + encodeURIComponent(language));
  }

  const edition =
    numericPage === 900 && !query
      ? makeSearchShellEdition(language)
      : await getEdition({ query: query || undefined, language });

  return (
    <TeletextApp
      initialPage={numericPage}
      edition={edition}
      initialQuery={query}
      initialLanguage={language}
    />
  );
}
