import { notFound } from "next/navigation";
import { getGlobalEdition, normalizeLanguage } from "@/lib/edition";
import TeletextApp from "@/components/TeletextApp";

export const revalidate = 86400;

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ lang?: string | string[]; u?: string | string[]; q?: string | string[] }>;
}) {
  const { page } = await params;
  if (!/^\d{3}$/.test(page)) notFound();
  const numericPage = Number(page);
  // Retired My X and arbitrary lookup URLs must never reach the AI provider.
  if (numericPage >= 800 || numericPage < 100) notFound();

  const queryParams = await searchParams;
  if (queryParams.u || queryParams.q) notFound();

  const rawLang = Array.isArray(queryParams.lang) ? queryParams.lang[0] : queryParams.lang;
  const language = normalizeLanguage(rawLang);
  return (
    <TeletextApp
      initialPage={numericPage}
      edition={await getGlobalEdition(language)}
      initialLanguage={language}
    />
  );
}
