import type { Metadata } from "next";

import AboutPage from "../about/page";
import { metadata as aboutMetadata } from "../about/page";

export const metadata: Metadata = {
  ...aboutMetadata,
  robots: { index: false, follow: true },
};

export default AboutPage;
