import CaseStudyPage from "../../components/v2/CaseStudyPage";
import { automatedSecurityHelperFlagship } from "../../data/portfolio-v2";
import { routeMetadata } from "../../data/route-metadata";

export const metadata = routeMetadata(
  "/work/automated-security-helper/",
  "Automated Security Helper",
  "How workspace-scale security keeps project ownership, boundaries, failures, and agent integrations clear from plan to report.",
);

export default function Page() {
  return <CaseStudyPage caseStudy={automatedSecurityHelperFlagship} />;
}
