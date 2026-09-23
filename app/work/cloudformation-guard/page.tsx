import CaseStudyPage from "../../components/v2/CaseStudyPage";
import { cloudFormationGuardCaseStudy } from "../../data/portfolio-v2";
import { routeMetadata } from "../../data/route-metadata";

export const metadata = routeMetadata(
  "/work/cloudformation-guard/",
  "CloudFormation Guard integrity",
  "See how policy intent stays intact across evaluation, reporting, tests, and published rule packs in Madison Hope Steiner's CloudFormation Guard work.",
);

export default function Page() {
  return <CaseStudyPage caseStudy={cloudFormationGuardCaseStudy} />;
}
