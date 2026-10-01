import { automatedSecurityHelperFlagship as project } from "../../data/portfolio-v2";
import { Arrow, SourceLink } from "../v2/Evidence";
import ProjectLineageField from "./ProjectLineageField";
import { CapabilityFeatureArt } from "@/app/components/v3/CapabilityBricks";

export default function FeaturedProjectStory() {
  return (
    <article className="living-feature" data-family="security" data-contribution-sculpture data-motion-once aria-labelledby="living-feature-title">
      <div className="living-feature__copy">
        <p className="living-feature__eyebrow">01 / Featured system</p>
        <p className="living-feature__project">{project.title}</p>
        <h3 id="living-feature-title">{project.cardHeadline}</h3>
        <p>{project.summary}</p>
        <p className="living-feature__contribution"><strong>My contribution</strong> {project.contributionSummary}</p>
        <div className="living-feature__actions">
          <a className="living-feature__action" href="/work/automated-security-helper/">Explore the system <Arrow /></a>
          <SourceLink sourceId={project.repositorySourceId}>See the working code</SourceLink>
        </div>
      </div>
      <CapabilityFeatureArt />
      <details className="living-feature__sources">
        <summary>View code and reviewed changes</summary>
        <ProjectLineageField caseStudy={project} compact inlineSources />
      </details>
    </article>
  );
}
