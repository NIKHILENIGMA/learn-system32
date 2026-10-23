import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { canvasAttempts, db, moduleProgress } from "@/db";
import type { CanvasEdge, CanvasNode } from "@/engine/types";
import { getModuleBySlug } from "@/modules";

interface SaveDraftRequestBody {
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  label?: string;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/modules/[slug]/draft">,
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

  let body: SaveDraftRequestBody;
  try {
    body = (await request.json()) as SaveDraftRequestBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid JSON request body.",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Request body must contain 'nodes' and 'edges' arrays.",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
    );
  }

  const now = new Date();
  let dbSaved = true;

  try {
    // Ensure module_progress record exists and is set to in_progress if currently not_started
    await db
      .insert(moduleProgress)
      .values({
        moduleSlug: slug,
        status: "in_progress",
        insightsUnlocked: false,
        bestScorePercent: 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: moduleProgress.moduleSlug,
        set: {
          status: "in_progress",
          updatedAt: now,
        },
      });

    // Check if an active draft already exists for this module
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
          nodesJson: body.nodes,
          edgesJson: body.edges,
          label: body.label ?? "Active Draft",
          updatedAt: now,
        })
        .where(eq(canvasAttempts.id, existingDrafts[0].id));
    } else {
      await db.insert(canvasAttempts).values({
        moduleSlug: slug,
        label: body.label ?? "Active Draft",
        nodesJson: body.nodes,
        edgesJson: body.edges,
        isActiveDraft: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch {
    dbSaved = false;
  }

  return NextResponse.json({
    success: true,
    data: {
      moduleSlug: slug,
      nodeCount: body.nodes.length,
      edgeCount: body.edges.length,
      updatedAt: now.toISOString(),
      persistedToDb: dbSaved,
    },
    timestamp: now.toISOString(),
  });
}
