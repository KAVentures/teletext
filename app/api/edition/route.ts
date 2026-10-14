import { NextRequest, NextResponse } from "next/server";
import { getGlobalEdition } from "@/lib/edition";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Reject all legacy parameters, even if users bypass the UI.
  if (request.nextUrl.searchParams.has("u") || request.nextUrl.searchParams.has("q")) {
    return NextResponse.json(
      { error: "X profile lookups and searches are permanently disabled." },
      { status: 410, headers: { "Cache-Control": "public, max-age=86400" } }
    );
  }
  const edition = await getGlobalEdition(request.nextUrl.searchParams.get("lang") || undefined);
  return NextResponse.json(edition, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" }
  });
}
