import { NextRequest, NextResponse } from "next/server";
import { getGlobalEdition, getMyXEdition } from "@/lib/edition";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const language = request.nextUrl.searchParams.get("lang") || undefined;
  const handles = request.nextUrl.searchParams.get("u") || undefined;
  const legacyQuery = request.nextUrl.searchParams.get("q");

  if (legacyQuery) {
    return NextResponse.json(
      { error: "Free-text search has been retired. Use My X profiles instead." },
      { status: 410, headers: { "Cache-Control": "public, s-maxage=86400" } }
    );
  }

  const edition = handles
    ? await getMyXEdition({ handles, language })
    : await getGlobalEdition(language);

  return NextResponse.json(edition, {
    headers: {
      "Cache-Control": handles
        ? "public, s-maxage=604800, stale-while-revalidate=86400"
        : "public, s-maxage=86400, stale-while-revalidate=3600"
    }
  });
}
