import { notFound } from "next/navigation";
import TeletextApp from "@/components/TeletextApp";
import { decodeSnapshot } from "@/lib/share";

export const dynamic = "force-dynamic";

export default async function SharedEditionPage({
  searchParams
}: {
  searchParams: Promise<{ d?: string | string[] }>;
}) {
  const params = await searchParams;
  const payload = Array.isArray(params.d) ? params.d[0] : params.d;
  if (!payload) notFound();

  try {
    const snapshot = decodeSnapshot(payload);
    return (
      <TeletextApp
        initialPage={snapshot.page}
        edition={snapshot.edition}
        initialQuery={snapshot.query || ""}
        initialLanguage={snapshot.language}
        isSnapshot
      />
    );
  } catch {
    notFound();
  }
}
