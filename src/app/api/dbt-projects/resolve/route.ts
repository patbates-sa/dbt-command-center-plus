import { NextResponse, type NextRequest } from "next/server";
import { getAppConfig } from "@/config/app";
import { resolveLocalProject } from "@/lib/dbt/local-projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { dbtProjectRoot } = getAppConfig();
  if (!dbtProjectRoot) {
    return NextResponse.json(
      { error: "DBT_PROJECT_ROOT is not set." },
      { status: 503 },
    );
  }

  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json(
      { error: "Missing required 'name' query parameter." },
      { status: 400 },
    );
  }

  const local = await resolveLocalProject(name);
  if (!local) {
    return NextResponse.json(
      {
        error: `No local dbt project under ${dbtProjectRoot} has a dbt_project.yml with name matching "${name}".`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ name: local.name, path: local.path });
}
