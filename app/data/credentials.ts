export type CredentialCategoryId =
  | "security-trust"
  | "architecture-operations"
  | "ai-data"
  | "platforms-industry";

export interface PublicCredential {
  readonly id: string;
  readonly name: string;
  readonly issuer: string;
  readonly issued: string;
  readonly issuedDate: `${number}-${number}-${number}`;
  readonly category: CredentialCategoryId;
  readonly image: `/credentials/${string}.webp`;
  readonly href: `https://www.credly.com/badges/${string}/public_url`;
}

export const credentialCategories = [
  {
    id: "security-trust",
    label: "Security and trust",
    summary: "Protecting systems, information, and recovery paths.",
  },
  {
    id: "architecture-operations",
    label: "Architecture and operations",
    summary: "Designing cloud systems teams can run with confidence.",
  },
  {
    id: "ai-data",
    label: "AI and data",
    summary: "Building fluency across machine learning, data, and AI delivery.",
  },
  {
    id: "platforms-industry",
    label: "Platforms and industry",
    summary: "Extending architecture across infrastructure and financial services.",
  },
] as const satisfies readonly {
  readonly id: CredentialCategoryId;
  readonly label: string;
  readonly summary: string;
}[];

const credential = (
  id: string,
  name: string,
  issuer: string,
  issued: string,
  issuedDate: PublicCredential["issuedDate"],
  category: CredentialCategoryId,
): PublicCredential => ({
  id,
  name,
  issuer,
  issued,
  issuedDate,
  category,
  image: `/credentials/${id}.webp`,
  href: `https://www.credly.com/badges/${id}/public_url`,
});

export const publicCredentials = [
  credential(
    "4b68c719-c0c0-4875-91c5-8a29f2d14a63",
    "Certified Information Systems Security Professional (CISSP)",
    "ISC2",
    "June 29, 2023",
    "2023-06-29",
    "security-trust",
  ),
  credential(
    "c054bfdf-abdb-4b0b-bbbd-dc8c99ca0be7",
    "AWS Certified Security – Specialty",
    "Amazon Web Services Training and Certification",
    "January 11, 2024",
    "2024-01-11",
    "security-trust",
  ),
  credential(
    "ae819b31-11bd-4ba8-9c62-4d011a71c797",
    "AWS Knowledge: Data Protection & Disaster Recovery - Training Badge",
    "Amazon Web Services Training and Certification",
    "January 6, 2023",
    "2023-01-06",
    "security-trust",
  ),
  credential(
    "8c186c65-bfa7-438f-983c-0aca58e76c31",
    "AWS Certified Advanced Networking – Specialty",
    "Amazon Web Services Training and Certification",
    "February 19, 2025",
    "2025-02-19",
    "architecture-operations",
  ),
  credential(
    "b3b85296-0e88-4075-a52c-8966a93c4ba5",
    "AWS Certified Solutions Architect – Professional",
    "Amazon Web Services Training and Certification",
    "August 18, 2023",
    "2023-08-18",
    "architecture-operations",
  ),
  credential(
    "652eaaae-55d6-436b-8b73-763610552b1d",
    "AWS Certified DevOps Engineer – Professional",
    "Amazon Web Services Training and Certification",
    "January 5, 2024",
    "2024-01-05",
    "architecture-operations",
  ),
  credential(
    "0973ba63-6a34-42e5-9d03-cbfaa58500a9",
    "AWS Certified SysOps Administrator – Associate",
    "Amazon Web Services Training and Certification",
    "November 25, 2024",
    "2024-11-25",
    "architecture-operations",
  ),
  credential(
    "6df21921-6917-431f-8370-b92ddd9326c2",
    "AWS Certified Solutions Architect – Associate",
    "Amazon Web Services Training and Certification",
    "October 19, 2022",
    "2022-10-19",
    "architecture-operations",
  ),
  credential(
    "91ce646f-8404-4575-8019-16e2f79cc199",
    "AWS Certified Cloud Practitioner",
    "Amazon Web Services Training and Certification",
    "October 14, 2022",
    "2022-10-14",
    "architecture-operations",
  ),
  credential(
    "127cf404-78cf-4664-bddf-7cad875a3f5d",
    "AWS Knowledge: Serverless - Training Badge",
    "Amazon Web Services Training and Certification",
    "January 6, 2023",
    "2023-01-06",
    "architecture-operations",
  ),
  credential(
    "767ee9a6-3e53-413f-9292-5014e322652e",
    "AWS Knowledge: Object Storage - Training Badge",
    "Amazon Web Services Training and Certification",
    "January 6, 2023",
    "2023-01-06",
    "architecture-operations",
  ),
  credential(
    "8511690c-6022-49a4-be65-b47711d403a1",
    "Well-Architected Proficient",
    "Amazon Web Services Training and Certification",
    "January 6, 2023",
    "2023-01-06",
    "architecture-operations",
  ),
  credential(
    "e91c5a7f-8836-452f-a667-640f595836ce",
    "AWS Certified Developer – Associate",
    "Amazon Web Services Training and Certification",
    "November 18, 2024",
    "2024-11-18",
    "architecture-operations",
  ),
  credential(
    "d72b6645-6f1f-43ec-8f6f-959dd7b9d84f",
    "AWS Certified AI Practitioner",
    "Amazon Web Services Training and Certification",
    "November 18, 2024",
    "2024-11-18",
    "ai-data",
  ),
  credential(
    "28ba2a54-aad6-4583-af9b-ac69ab1b4712",
    "AWS Certified AI Practitioner Early Adopter",
    "Amazon Web Services Training and Certification",
    "November 18, 2024",
    "2024-11-18",
    "ai-data",
  ),
  credential(
    "bfe454ae-08b2-4885-93cd-ae649c712bff",
    "AWS AI-Driven Development Lifecycle (AI-DLC) Ambassador Foundational (L100)",
    "AWS Worldwide Field Enablement",
    "July 23, 2026",
    "2026-07-23",
    "ai-data",
  ),
  credential(
    "8cf695a0-c42b-4e92-ab3d-984ce96dd29a",
    "AWS AI Foundational (L100) Accreditation",
    "AWS Worldwide Field Enablement",
    "October 10, 2025",
    "2025-10-10",
    "ai-data",
  ),
  credential(
    "1ab58e76-a7e9-4eb0-b783-5665cc584db0",
    "AWS Certified Machine Learning – Specialty",
    "Amazon Web Services Training and Certification",
    "May 6, 2025",
    "2025-05-06",
    "ai-data",
  ),
  credential(
    "712672a0-79b0-456a-b105-e278cb59ec41",
    "AWS Certified Data Engineer – Associate",
    "Amazon Web Services Training and Certification",
    "May 2, 2025",
    "2025-05-02",
    "ai-data",
  ),
  credential(
    "8c24554d-15a9-4d02-a37f-36abe980e424",
    "AWS Certified Machine Learning Engineer – Associate",
    "Amazon Web Services Training and Certification",
    "April 1, 2025",
    "2025-04-01",
    "ai-data",
  ),
  credential(
    "5389ac76-260b-4211-b2b7-db0413df9601",
    "HashiCorp Certified: Terraform Associate (003)",
    "IBM Professional Certification",
    "December 20, 2024",
    "2024-12-20",
    "platforms-industry",
  ),
  credential(
    "6dd54e5f-a6e9-4124-bd91-765f436d3e7d",
    "HashiCorp Certified: Terraform Associate (002)",
    "IBM Professional Certification",
    "December 13, 2022",
    "2022-12-13",
    "platforms-industry",
  ),
  credential(
    "9ee1ca60-d39b-4f1d-9b11-c27978e6838b",
    "CKAD: Certified Kubernetes Application Developer",
    "The Linux Foundation",
    "April 4, 2024",
    "2024-04-04",
    "platforms-industry",
  ),
  credential(
    "319b79d7-c02c-4e66-8a19-e03e220373fc",
    "AWS Industry Financial Services Intermediate (L200)",
    "AWS Worldwide Field Enablement",
    "November 26, 2024",
    "2024-11-26",
    "platforms-industry",
  ),
  credential(
    "52ade23d-54c8-48bb-b90a-e132a877f7ba",
    "AWS Industry Financial Services Foundational (L100)",
    "AWS Worldwide Field Enablement",
    "March 29, 2024",
    "2024-03-29",
    "platforms-industry",
  ),
] as const satisfies readonly PublicCredential[];

export const credentialsByCategory = credentialCategories.map((category) => ({
  ...category,
  credentials: publicCredentials
    .filter((item) => item.category === category.id)
    .sort((left, right) => right.issuedDate.localeCompare(left.issuedDate)),
}));

export const credentialYears = [...new Set(
  publicCredentials.map((item) => item.issuedDate.slice(0, 4)),
)].sort((left, right) => right.localeCompare(left));
