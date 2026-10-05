import { NextRequest, NextResponse } from "next/server";
import { getEdition } from "@/lib/edition";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || undefined;
  const language = request.nextUrl.searchParams.get("lang") || undefined;
  const edition = await getEdition({ query, language });

  return NextResponse.json(edition, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=540"
    }
  });
}
