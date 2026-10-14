import { NextRequest, NextResponse } from "next/server";
import { encodeSnapshot, type ShareSnapshot } from "@/lib/share";
import type { TeletextEdition } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      page?: number;
      language?: string;
      handles?: string[];
      edition?: TeletextEdition;
    };
    if (!Number.isInteger(body.page) || (body.page as number) >= 800 ||
      (body.page as number) < 100 || !body.edition ||
      !Array.isArray(body.edition.stories) ||
      typeof body.language !== "string" ||
      body.handles?.length || body.edition.handles?.length) {
      return NextResponse.json({ error: "Invalid or retired edition" }, { status: 400 });
    }
    const snapshot: ShareSnapshot = {
      v: 1,
      page: body.page as number,
      language: body.language,
      edition: body.edition
    };
    return NextResponse.json(
      { path: "/s?d=" + encodeURIComponent(encodeSnapshot(snapshot)) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Could not create share link" }, { status: 400 });
  }
}
