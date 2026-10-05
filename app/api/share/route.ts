import { NextRequest, NextResponse } from "next/server";
import { encodeSnapshot, type ShareSnapshot } from "@/lib/share";
import type { TeletextEdition } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      page?: number;
      language?: string;
      query?: string;
      edition?: TeletextEdition;
    };

    if (
      !Number.isInteger(body.page) ||
      !body.edition ||
      !Array.isArray(body.edition.stories) ||
      typeof body.language !== "string"
    ) {
      return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
    }

    const query = (body.query || "").trim().slice(0, 120);
    const snapshot: ShareSnapshot = {
      v: 1,
      page: body.page as number,
      language: body.language,
      ...(query ? { query } : {}),
      edition: body.edition
    };

    const payload = encodeSnapshot(snapshot);
    return NextResponse.json(
      { path: "/s?d=" + encodeURIComponent(payload) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Could not create share link" }, { status: 400 });
  }
}
