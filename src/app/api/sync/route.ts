import { NextRequest, NextResponse } from "next/server";
import { syncMatchesAndScore } from "@/lib/football";

/**
 * GET /api/sync
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when the
 * CRON_SECRET env var is set. For an external pinger (cron-job.org etc.) during
 * live matches, set the same header manually. Internally throttled to one real
 * API hit per 60s.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncMatchesAndScore();
  return NextResponse.json(result);
}
