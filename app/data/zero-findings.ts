import type { BlogArticle } from "./blog";

export const zeroFindings = {
  slug: "zero-findings",
  title: "What does “zero findings” actually mean?",
  deck: "Two scans report the same number. Only one tells me enough to make the next decision.",
  topic: "security",
  tags: ["Scan coverage", "Data freshness", "Release decisions"],
  project: "Automated Security Helper",
  overview: "A finding count says what a scan reported. Coverage and freshness tell me how far I can trust it.",
  intro: [
    "Would you make the same release decision for two changes if both security reports said zero findings? I would want to know what ran before I answered. In the first scan, every planned check ran with current information. In the second, an infrastructure check never ran. The zero belongs to the checks that did. It tells me nothing about the missing one.",
    "I use two made-up scan records below to show the difference. The count never changes as you scroll. The evidence behind it does. That distinction shaped two changes I made in Automated Security Helper, or ASH: make gaps in the run visible, and tell the operator when a supported scanner's data is past its useful age.",
  ],
  diagram: {
    kind: "flow",
    title: "Two zeroes, two decisions.",
    steps: [
      { label: "Findings", detail: "Both illustrative runs reported zero." },
      { label: "Coverage", detail: "Scan A ran all three planned checks. Scan B ran two; its infrastructure check never ran." },
      { label: "Freshness", detail: "In Scan B, a check that did run also used dependency data past its age limit." },
      { label: "Next decision", detail: "Review A within its scope. Resolve B's gaps or explicitly narrow the decision." },
    ],
    caption: "Illustrative records, not ASH output. Coverage and input freshness have separate meanings.",
  },
  sections: [
    {
      id: "same-count", title: "Start with the decision, not the counter.",
      paragraphs: [
        "A finding count is useful. If a completed check reports a problem, I want to see it even if another part of the run failed. The counting mistake is to ask a number to stand in for the run itself. An empty list could mean that the checks found nothing. It could also mean that the checks with something to say never got to speak.",
        "This becomes an architectural problem when a result leaves the tool. A developer can read the terminal and notice a missing scanner. The next system may receive only a summary, and the person reviewing a release may see only a check mark. If the result drops the reason along the way, every downstream reader has to guess how much confidence to give it.",
      ],
      sources: ["ash-coverage", "ash-380"],
    },
    {
      id: "coverage", title: "What did we expect to run?",
      paragraphs: [
        "When I worked on coverage in ASH, I wanted the tool to preserve the difference between a scanner that reported no findings, one that was deliberately outside the plan, and one that was expected but missing. They can all produce an empty list. They should not have the same meaning. Where supported scanners report counts by target, the check can also surface an unevaluated target inside a run that otherwise finished.",
        "The review for the coverage change records a case on ASH's own tree. Four of eleven candidates showed up as unevaluated. Two really were templates that had been missed. Two were not templates at all. The denominator needed work as much as the verdict did. Calling all four failures would have been louder, but it would not have made the report more accurate.",
        "An intentional exclusion belongs in the scope. An unexpected omission belongs in the result. Neither should quietly disappear when the report is summarized.",
      ],
      sources: ["ash-coverage"],
      detail: {
        title: "Give the denominator a name.",
        steps: ["Record the applicable checks", "Record which checks reached their targets", "Keep the reasons for omissions"],
        caption: "This comparison uses three illustrative checks. It is not an inventory of ASH scanners or a claim about all detectable findings.",
      },
    },
    {
      id: "freshness", title: "What did the completed check know?",
      paragraphs: [
        "Now suppose the scanner did run. I still want to know what information it used. A fixed tool version tells me which executable made the decision. It does not tell me when a vulnerability database was built or when a set of rules was last updated. Copying a database today does not make the information inside it current today.",
        "The second change makes age explicit for supported scanner databases and offline rulesets. I looked at the age signal each supported input could actually provide, rather than assuming the same clock was right for all of them. ASH can report when that data is stale or its age cannot be established. A check that ran with stale data is different from a check that never ran. In Scan B, you can see both states without changing the finding count.",
        "Freshness is still a limited claim. It tells me that a supported input is within its configured age limit. It does not tell me that the database knows about a vulnerability disclosed this morning, or that every input used by every scanner has an age check.",
      ],
      sources: ["ash-freshness"],
    },
    {
      id: "decision", title: "Keep the evidence attached to the verdict.",
      paragraphs: [
        "ASH 3.8.0 makes detected incompleteness fail by default while keeping the findings available. That is a policy decision, not a reason to throw the work away. An operator can choose a different response to an incomplete run or a freshness warning. I want the caller to see the facts that led to that choice, even when the policy permits the workflow to continue.",
        "The agent-facing interface makes the distinction particularly clear. A run can be finished, so a caller can stop waiting and read the report, while its coverage is still incomplete. Those are two different questions. If the agent treats the first answer as permission to proceed, it has made a release decision the scanner never made.",
        "For Scan A, I can review what the checks reported within the stated scope. For Scan B, I would find out why the infrastructure check was missing and decide whether to rerun with current data. If I choose to proceed with a narrower scope, I want the next person to see what I left out and why.",
      ],
      sources: ["ash-380", "ash-coverage", "ash-freshness"],
    },
  ],
  takeaway: "Before I let a result move the work forward, I ask what ran, what it knew, and whether that is enough for this decision. If the report cannot answer those questions, what are we asking a zero to prove?",
  implementationNotes: [
    "The coverage change uses the scanner statuses and target counts it receives. It does not prove completeness beyond the planned and reported checks.",
    "Freshness checks cover supported inputs. An explicit warn policy can preserve a warning without making age alone fail the run.",
    "The two animated records are an explanation of the decision, not a screenshot, a benchmark, or a guarantee of safety.",
  ],
  sources: [
    { id: "ash-coverage", label: "ASH #640: make incomplete scanner coverage explicit", href: "https://github.com/awslabs/automated-security-helper/pull/640" },
    { id: "ash-freshness", label: "ASH #696: check the age of supported scanner data", href: "https://github.com/awslabs/automated-security-helper/pull/696" },
    { id: "ash-380", label: "ASH 3.8.0: released behavior and defaults", href: "https://github.com/awslabs/automated-security-helper/releases/tag/v3.8.0" },
  ],
  relatedCase: { label: "How these checks fit into the wider ASH work", href: "/work/automated-security-helper/" },
} as const satisfies BlogArticle;
