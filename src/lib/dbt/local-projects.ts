import { promises as fs } from "node:fs";
import path from "node:path";
import { getAppConfig } from "@/config/app";

export interface LocalDbtProject {
  name: string;
  path: string;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

async function readProjectName(yamlPath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(yamlPath, "utf8");
    const m = content.match(/^name:\s*['"]?([^'"#\s]+)['"]?/m);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function listLocalDbtProjects(): Promise<LocalDbtProject[]> {
  const { dbtProjectRoot } = getAppConfig();
  if (!dbtProjectRoot) return [];
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dbtProjectRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const projects: LocalDbtProject[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(dbtProjectRoot, e.name);
    const name = await readProjectName(path.join(dir, "dbt_project.yml"));
    if (name) projects.push({ name, path: dir });
  }
  return projects;
}

export async function resolveLocalProject(
  displayName: string,
): Promise<LocalDbtProject | null> {
  const target = normalize(displayName);
  const all = await listLocalDbtProjects();
  return all.find((p) => normalize(p.name) === target) ?? null;
}
