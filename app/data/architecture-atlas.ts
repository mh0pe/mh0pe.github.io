export const architectureAreas = [
  { id: "foundations", kind: "windows", caseId: "nix-windows", label: "Foundations", project: "Nix on Windows", outcome: "Run builds on Windows without giving up the shared build system.", mark: "M2 8h16v9H2z" },
  { id: "security", kind: "security", caseId: "automated-security-helper", label: "Security", project: "Automated Security Helper", outcome: "Combine security checks without losing which project each result belongs to.", mark: "M2 5h9v6h7v6H2z" },
  { id: "tools", kind: "policy", caseId: "cloudformation-guard", label: "Developer tools", project: "CloudFormation Guard", outcome: "Tell a failed rule from a missing value or a check that could not run.", mark: "M2 9h5V4h6v5h5v8H2z" },
  { id: "ai", kind: "continuity", caseId: "agent-systems", label: "AI workflows", project: "Agent systems", outcome: "Let the next agent session pick up the work without starting over.", mark: "M2 5h13v6h3v6H5v-6H2z" },
] as const;
