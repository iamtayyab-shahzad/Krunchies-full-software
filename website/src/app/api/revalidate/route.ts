import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand ISR purge for public catalog pages.
 * Called by the Go backend after admin product/category/size writes.
 *
 * Auth: header `x-revalidate-secret` must match env `REVALIDATE_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error("ISR: REVALIDATE_SECRET is not configured on website");
    return NextResponse.json(
      { ok: false, error: "revalidate not configured" },
      { status: 503 },
    );
  }

  const header =
    request.headers.get("x-revalidate-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (header !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let reason = "unknown";
  try {
    const body = (await request.json()) as { reason?: string };
    if (body?.reason) reason = String(body.reason);
  } catch {
    /* body optional */
  }

  revalidatePath("/menu");
  revalidatePath("/");

  console.log(
    `ISR: revalidated /menu and / due to product/category change: ${reason}`,
  );

  return NextResponse.json({
    ok: true,
    revalidated: ["/", "/menu"],
    reason,
    at: new Date().toISOString(),
  });
}
