import type { Metadata } from "next";

import ProofPage from "../proof/page";
import { metadata as proofMetadata } from "../proof/page";

export const metadata: Metadata = {
  ...proofMetadata,
  robots: { index: false, follow: true },
};

export default ProofPage;
