import { NextRequest, NextResponse } from "next/server";
import { verifyDailyPublisherToken } from "@/lib/github-oidc";
import { buildDailyEditions } from "@/lib/editor";

export const runtime = "nodejs";
export const maxDuration = 300;

// Private publisher: only the trusted GitHub Actions main-branch workflow may
// invoke the paid daily generation. Visitor routes never import this module.
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") ||
      !(await verifyDailyPublisherToken(authorization.slice(7)))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const editions = await buildDailyEditions();
    return NextResponse.json(
      { date: new Date().toISOString().slice(0, 10), editions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Daily publisher failed", error);
    return NextResponse.json(
      { error: "Daily publication failed; the previous bulletin remains available." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
