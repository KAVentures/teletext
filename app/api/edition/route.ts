import { NextResponse } from "next/server";
import { getEdition } from "@/lib/edition";

export const runtime = "nodejs";

export async function GET() {
  const edition = await getEdition();
  return NextResponse.json(edition, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=840"
    }
  });
}
