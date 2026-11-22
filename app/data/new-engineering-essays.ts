import type { BlogArticle } from "./blog";

export const slowestShard = {
  slug: "slowest-shard",
  title: "The slowest shard is the build.",
  deck: "Why an even split of test files can leave one worker doing most of the waiting.",
  topic: "developer-tools",
  tags: ["Build performance", "CI", "Verification"],
  project: "Automated Security Helper",
  overview: "Parallel tests don't finish when the average worker is done. The last worker sets the wait.",
  intro: [
    "A test run can have eight green jobs and still keep you waiting on the ninth. When I worked on test sharding in Automated Security Helper, I wanted to know how much of that wait came from the tests themselves and how much came from the way we divided them. The two problems need different fixes.",
    "The old assignment gave each test module a stable home by hashing its name. That made it easy to reproduce a split and to absorb new modules. But it did not know what a module cost to run. Equal numbers of files looked fair on paper. They could put two slow modules in one worker and a handful of quick ones in another.",
  ],
  diagram: {
    kind: "flow",
    title: "Same work. Different finish times.",
    steps: [
      { label: "Divide by name", detail: "Stable placement can still put slow work in the same lane." },
      { label: "Divide by observed time", detail: "Schedule the heaviest units first so they land in different lanes." },
      { label: "Check the union", detail: "The jobs must still run the same set of tests exactly once." },
    ],
    caption: "The bars illustrate assignment and estimated work, not the runtime of a new CI run.",
  },
  sections: [
    {
      id: "counting", title: "Equal files are not equal work.",
      paragraphs: [
        "I drew the workers as lanes and the tests as blocks. If two long blocks land on the same lane, the empty space in the other lanes does not help. They cannot go back in time and pick up the work. If the test job is a gate, its finish time depends on the heaviest lane, not the mean.",
        "That changed the question I asked of the planner. It didn't need to predict the next run down to the second. It had to make a better decision about where the expensive work went with the information we already had.",
      ],
      sources: ["ash-balanced-tests"],
      detail: {
        title: "Measure the wait reviewers actually see.",
        steps: ["Look at the last worker to finish", "Separate test execution from setup", "Ask which work could have gone elsewhere"],
        caption: "A test plan can balance recorded execution time without accounting for runner startup, contention, or variance.",
      },
    },
    {
      id: "placement", title: "Give the heavy work a place first.",
      paragraphs: [
        "In the change I submitted, recorded durations drive a longest-first plan. Start with the largest job, put it on the least loaded lane, and repeat. Smaller pieces can fill the gaps that are left. There was also a case where the module itself was too big to balance as one unit. Splitting that module helped in a way that shuffling it around never could.",
        "On historical Python 3.12 Windows integration results, the heaviest lane in the replay went from 4,708 to 1,695 test-seconds. An even share of the recorded work would have been about 1,659. Those are modeled loads, not shorter wall-clock times measured after deployment. A replay tells me the plan is worth trying. A real run tells me whether the saved waiting survived contact with the runners.",
        "A new test cannot wait for a timing record before it is allowed to run. The plan keeps deterministic hash assignment as a fallback for tests it hasn't seen. If the plan is malformed, the tooling rejects it. Missing history and broken configuration get different responses.",
      ],
      sources: ["ash-balanced-tests"],
    },
    {
      id: "verification", title: "Prove the faster plan kept the tests.",
      paragraphs: [
        "There is a straightforward way to get a faster suite that nobody wants: accidentally stop running part of it. I compared the original collection with the union collected by the new shards. The review records 7,832 integration tests and 61,601 unit tests in that check, with no dropped or duplicated tests. Collection establishes membership, not whether execution will pass.",
        "I would keep the assignment and its proof apart. Show that balancing reduces the modeled peak. Separately show that every test still has exactly one home. If one check fails, you can tell whether you lost the time savings or the meaning of the gate.",
        "If you have already added workers and the suite still feels slow, what does the last worker know about your tests that the scheduler doesn't?",
      ],
      sources: ["ash-balanced-tests"],
    },
  ],
  takeaway: "Balance the time people wait, then prove that every test still runs exactly once.",
  implementationNotes: [
    "Reported seconds are a replay of historical durations, not a post-merge benchmark or isolated Linux result.",
    "The counts describe a collect-only comparison. They are not claims about test pass rates.",
  ],
  sources: [{ id: "ash-balanced-tests", label: "ASH #965: weight test shards by duration", href: "https://github.com/awslabs/automated-security-helper/pull/965" }],
  relatedCase: { label: "See the work behind Automated Security Helper", href: "/work/automated-security-helper/" },
} as const satisfies BlogArticle;

export const supportMatrix = {
  slug: "support-is-a-matrix",
  title: "Support is a matrix, not a version number.",
  deck: "What I learned making Rust bindings reflect both the SDK someone installs and the chip they build for.",
  topic: "infrastructure",
  tags: ["Rust", "Compatibility", "Build systems"],
  project: "ESP-IDF Rust bindings",
  overview: "A Rust binding may depend on the SDK version, a component setting, and a feature of the actual chip.",
  intro: [
    "If I say a Rust binding supports a new version of a C SDK, what should someone with an older board expect? The new version can know about the board without the board having every peripheral the SDK describes. A version number gets me to the right shelf. It doesn't tell me which parts are in the box.",
    "That was the problem behind a change I worked on in esp-idf-sys, which exposes Espressif's C interfaces to Rust. I carried forward drinkcat's work and added changes in the review. What interested me was how to keep the bindings honest when a header moved, a component might be off, or one chip had a capability the next chip did not.",
  ],
  diagram: {
    kind: "layers",
    title: "Three conditions decide what can cross.",
    steps: [
      { label: "SDK version", detail: "Which release supplies the interface, and where?" },
      { label: "Component", detail: "Was that feature enabled for this build?" },
      { label: "Chip capability", detail: "Can this target actually supply the peripheral?" },
    ],
    caption: "The matrix is an illustration, not an authoritative list of supported chips.",
  },
  sections: [
    {
      id: "versions", title: "A version answers only one question.",
      paragraphs: [
        "When a new SDK changes the set of headers, a binding generator needs to know where an interface lives. The USB CDC console header in this change is a useful example. It had been pulled in through the older VFS grouping before version 6. The change ties the include to the console component when it's enabled, rather than assuming a sufficiently new SDK is enough.",
        "That matters at the point a developer uses the binding. A missing or invalid declaration may otherwise look like a Rust problem, even when the real question is what the C SDK makes available in that configuration.",
      ],
      sources: ["esp-bindings-matrix"],
      detail: {
        title: "Name each condition where it matters.",
        steps: ["Find the header in the right release", "Check that the configuration includes the component", "Check the chip capability for target-specific interfaces"],
        caption: "Individual headers have different conditions. The three questions aren't one blanket guard.",
      },
    },
    {
      id: "targets", title: "A component can exist without a particular peripheral.",
      paragraphs: [
        "The camera controller makes the distinction visible. The controller header is conditional on enabling its component. The CSI camera interface is separately guarded by a chip capability. Turning on the camera component doesn't make a chip grow a MIPI CSI interface. The JPEG paths give another example: encoding and decoding each have their own capability check.",
        "I prefer these checks close to the header they protect. One broad condition at the top is shorter, but it can smuggle in the assumption that everything below it shares the same support boundary. That assumption tends to surface later as a broken build on a configuration the author didn't use.",
      ],
      sources: ["esp-bindings-matrix"],
    },
    {
      id: "proof", title: "A build matrix is a useful, bounded promise.",
      paragraphs: [
        "The pull request lists coverage from ESP-IDF v4.4.8 through v6.0, with explicit target exclusions. A build matrix makes those choices reviewable. A missing cell can mean the pairing is intentionally outside the check. That is a different statement from a green build and a different statement from a broken one.",
        "The matrix checks compilation for the combinations it covers. It can't tell me whether a camera is wired correctly, what the device will do under load, or whether every board marketed with a given chip behaves the same way. Those need different evidence. I want the support statement to say where the build check stops.",
        "The test I use for a compatibility claim is simple: could someone point to their own version, target, and configuration and tell which parts of that claim apply to them?",
      ],
      sources: ["esp-bindings-matrix"],
    },
  ],
  takeaway: "State support at the version, component, and chip boundary. A green build is evidence for that combination, not a hardware test.",
  implementationNotes: [
    "The contributed change builds on earlier commits by drinkcat, preserved in the review.",
    "The PR's matrix and exclusions describe the build configurations exercised, not field or hardware certification.",
  ],
  sources: [{ id: "esp-bindings-matrix", label: "esp-idf-sys #409: ESP-IDF binding support across releases and targets", href: "https://github.com/esp-rs/esp-idf-sys/pull/409" }],
} as const satisfies BlogArticle;
