import { NextResponse, type NextRequest } from "next/server";
import {
  parseModulesListQuery,
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type ModuleCardSummaryDto,
  type ModuleListMetaDto,
} from "@/modules/dto";
import { listModulesWithProgress } from "@/modules/service";

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<
    | ApiSuccessResponse<ModuleCardSummaryDto[], ModuleListMetaDto>
    | ApiErrorResponse
  >
> {
  const parsedQuery = parseModulesListQuery(request.nextUrl.searchParams);

  if (!parsedQuery.ok) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: parsedQuery.errorCode,
          message: parsedQuery.message,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
    );
  }

  const result = await listModulesWithProgress(parsedQuery.value);

  return NextResponse.json({
    success: true,
    data: result.items,
    meta: result.meta,
    timestamp: new Date().toISOString(),
  });
}
