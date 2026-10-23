import { connection } from "next/server";
import { SkillTreeExplorer } from "@/components/dashboard/skill-tree-explorer";
import { listModulesWithProgress } from "@/modules/service";

export default async function SkillTreeDashboardPage() {
  await connection();
  const { items, meta } = await listModulesWithProgress();

  return <SkillTreeExplorer initialModules={items} meta={meta} />;
}
