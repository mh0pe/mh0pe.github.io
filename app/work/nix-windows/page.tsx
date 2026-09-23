import CaseStudyPage from "../../components/v2/CaseStudyPage";
import { nixWindowsCaseStudy } from "../../data/portfolio-v2";
import { routeMetadata } from "../../data/route-metadata";

export const metadata = routeMetadata(
  "/work/nix-windows/",
  "Nix on Windows",
  "How a staged, independently testable path advances reproducible Nix builds across the Windows platform boundary.",
);

export default function Page() {
  return <CaseStudyPage caseStudy={nixWindowsCaseStudy} />;
}
