import { NextRequest, NextResponse } from "next/server";
import { getEdition } from "@/lib/edition";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || undefined;
  const language = request.nextUrl.searchParams.get("lang") || undefined;
  const edition = await getEdition({ query, language });

  const cacheControl = query
    ? "public, s-maxage=86400, stale-while-revalidate=3600"
    : "public, s-maxage=14400, stale-while-revalidate=900";

  return NextResponse.json(edition, {
    headers: {
      "Cache-Control": cacheControl
    }
  });
}
