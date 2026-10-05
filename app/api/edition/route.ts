import { NextRequest, NextResponse } from "next/server";
import { getEdition } from "@/lib/edition";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || undefined;
  const language = request.nextUrl.searchParams.get("lang") || undefined;
  const edition = await getEdition({ query, language });

  const cacheControl = query
    ? "public, s-maxage=1800, stale-while-revalidate=300"
    : "public, s-maxage=600, stale-while-revalidate=120";

  return NextResponse.json(edition, {
    headers: {
      "Cache-Control": cacheControl
    }
  });
}
