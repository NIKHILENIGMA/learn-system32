import { NextResponse, type NextRequest } from "next/server";
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ModuleDetailDto,
} from "@/modules/dto";
import { getModuleDetailBySlug } from "@/modules/service";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/modules/[slug]">,
): Promise<
  NextResponse<ApiSuccessResponse<ModuleDetailDto> | ApiErrorResponse>
> {
  const { slug } = await context.params;
  const peekParam = request.nextUrl.searchParams.get("peek");
  const peekInsights = peekParam === "true" || peekParam === "1";

  const detail = await getModuleDetailBySlug(slug, { peekInsights });

  if (!detail) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MODULE_NOT_FOUND",
          message: `Learning module '${slug}' was not found in src/modules/.`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: detail,
    timestamp: new Date().toISOString(),
  });
}
