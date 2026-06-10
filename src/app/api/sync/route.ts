import { NextRequest, NextResponse } from "next/server";
import { syncMatchesAndScore } from "@/lib/football";

/**
 * GET /api/sync?secret=...
 * Call this from a cron pinger (cron-job.org etc.) every 1-2 minutes during live
 * matches. Internally throttled to one real API hit per 60s.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncMatchesAndScore();
  return NextResponse.json(result);
}
