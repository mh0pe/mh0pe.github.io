import { hydrateRoot } from "react-dom/client";
import AttributionExplorer from "./AttributionExplorer";

const root = document.querySelector("[data-model-explorer-root]");
if (root) hydrateRoot(root, <AttributionExplorer sectionCode="01 / Model composition" />);
