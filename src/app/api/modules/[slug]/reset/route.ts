import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { canvasAttempts, db } from "@/db";
import { getModuleBySlug } from "@/modules";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/modules/[slug]/reset">,
): Promise<NextResponse> {
  const { slug } = await context.params;
  const mod = getModuleBySlug(slug);

  if (!mod) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MODULE_NOT_FOUND",
          message: `Learning module '${slug}' was not found.`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 404 },
    );
  }

  const now = new Date();
  let dbSaved = true;

  try {
    const existingDrafts = await db
      .select({ id: canvasAttempts.id })
      .from(canvasAttempts)
      .where(
        and(
          eq(canvasAttempts.moduleSlug, slug),
          eq(canvasAttempts.isActiveDraft, true),
        ),
      )
      .limit(1);

    if (existingDrafts.length > 0 && existingDrafts[0]) {
      await db
        .update(canvasAttempts)
        .set({
          nodesJson: mod.starterGraph.nodes,
          edgesJson: mod.starterGraph.edges,
          label: "Reset to Starter Graph",
          updatedAt: now,
        })
        .where(eq(canvasAttempts.id, existingDrafts[0].id));
    }
  } catch {
    dbSaved = false;
  }

  return NextResponse.json({
    success: true,
    data: {
      starterGraph: mod.starterGraph,
      resetAt: now.toISOString(),
      persistedToDb: dbSaved,
    },
    timestamp: now.toISOString(),
  });
}
