import CaseStudyPage from "../../components/v2/CaseStudyPage";
import { agentSystemsCaseStudy } from "../../data/portfolio-v2";
import { routeMetadata } from "../../data/route-metadata";

export const metadata = routeMetadata(
  "/work/agent-systems/",
  "Organizational agent systems",
  "How Madison Hope Steiner helps pioneer subagents, coordinated agent teams, durable decisions, and organizations that improve their own operating playbooks.",
);

export default function Page() {
  return <CaseStudyPage caseStudy={agentSystemsCaseStudy} />;
}
