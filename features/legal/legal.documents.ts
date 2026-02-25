export type LegalDocumentSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: "terms" | "privacy" | "disclaimer" | "data-handling";
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  contactEmail: string;
  jurisdiction: string;
  sections: LegalDocumentSection[];
};

const CONTACT_EMAIL = "legal@attendrix.app";
const JURISDICTION = "India";

export const LEGAL_DOCUMENTS: Record<LegalDocument["slug"], LegalDocument> = {
  terms: {
    slug: "terms",
    title: "Terms of Service",
    description: "Terms governing access and usage of Studytrix.",
    version: "1.0.0",
    effectiveDate: "February 25, 2026",
    lastUpdated: "February 25, 2026",
    contactEmail: CONTACT_EMAIL,
    jurisdiction: JURISDICTION,
    sections: [
      {
        heading: "Acceptance of Terms",
        paragraphs: [
          "By using Studytrix, you agree to these Terms of Service and related policies.",
          "If you do not agree with these terms, you must stop using the application.",
        ],
      },
      {
        heading: "Use of Service",
        paragraphs: [
          "You are responsible for content you access, manage, or store in Studytrix.",
          "You must not use the service for unlawful activity, abuse, or unauthorized access attempts.",
        ],
      },
      {
        heading: "Account and Data Responsibility",
        paragraphs: [
          "Studytrix may rely on local browser/device storage for feature functionality.",
          "You are responsible for maintaining your own backup and recovery strategy.",
        ],
      },
      {
        heading: "Limitation of Liability",
        paragraphs: [
          "The service is provided on an as-is basis without warranties of uninterrupted availability.",
          "To the maximum extent permitted by law, liability is limited for data loss, corruption, or business interruption.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    description: "How Studytrix handles privacy and personal data.",
    version: "1.0.0",
    effectiveDate: "February 25, 2026",
    lastUpdated: "February 25, 2026",
    contactEmail: CONTACT_EMAIL,
    jurisdiction: JURISDICTION,
    sections: [
      {
        heading: "Data Collected",
        paragraphs: [
          "Studytrix stores core preference and workspace state locally in your browser/device.",
          "Personal profile fields used for personalization remain local unless explicitly shared by you.",
        ],
      },
      {
        heading: "How Data Is Used",
        paragraphs: [
          "Local data is used to personalize app behavior, preserve settings, and enable offline workflows.",
          "No sensitive document upload to server is required for personal repository visibility and local organization workflows.",
        ],
      },
      {
        heading: "Retention and Deletion",
        paragraphs: [
          "Local data can be removed by clearing browser/app storage or uninstalling the PWA.",
          "In incognito/private sessions, stored data may be removed when the session ends.",
        ],
      },
      {
        heading: "Your Rights",
        paragraphs: [
          "You may clear local data at any time using browser controls or in-app storage controls.",
          "For policy-related requests, contact the legal email provided in this policy.",
        ],
      },
    ],
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    description: "Important usage and risk disclosures for Studytrix.",
    version: "1.0.0",
    effectiveDate: "February 25, 2026",
    lastUpdated: "February 25, 2026",
    contactEmail: CONTACT_EMAIL,
    jurisdiction: JURISDICTION,
    sections: [
      {
        heading: "General Disclaimer",
        paragraphs: [
          "Studytrix is provided for educational productivity and workflow management.",
          "The app is currently in beta and features may change without notice.",
        ],
      },
      {
        heading: "Local Storage Risk",
        paragraphs: [
          "Personal workspace items are currently stored locally on your device/browser storage.",
          "Storage may be lost due to browser clearing, profile resets, storage permission changes, or device-level issues.",
        ],
      },
      {
        heading: "Confidentiality Warning",
        paragraphs: [
          "Do not upload or manage confidential, regulated, or highly sensitive documents unless you accept local-storage risk.",
          "You remain solely responsible for safeguarding your data and maintaining backups.",
        ],
      },
    ],
  },
  "data-handling": {
    slug: "data-handling",
    title: "Data Handling Policy",
    description: "Storage model, processing boundaries, and operational safeguards.",
    version: "1.0.0",
    effectiveDate: "February 25, 2026",
    lastUpdated: "February 25, 2026",
    contactEmail: CONTACT_EMAIL,
    jurisdiction: JURISDICTION,
    sections: [
      {
        heading: "Storage Model",
        paragraphs: [
          "Studytrix uses browser/device-local mechanisms including IndexedDB and related local persistence mechanisms.",
          "Offline and personal-workspace behavior depends on browser support, granted permissions, and available storage quota.",
        ],
      },
      {
        heading: "Processing Boundaries",
        paragraphs: [
          "Core workspace interactions are designed to run locally where feasible, including preference-driven personalization and local indexing flows.",
          "External network calls occur for configured APIs and integrations used by selected product features.",
        ],
      },
      {
        heading: "Operational Controls",
        paragraphs: [
          "Users should periodically back up critical study resources outside of app-local storage.",
          "If local storage becomes unavailable or corrupted, Studytrix may be unable to recover personal workspace state.",
        ],
      },
    ],
  },
};

export function getLegalDocumentBySlug(
  slug: LegalDocument["slug"],
): LegalDocument {
  return LEGAL_DOCUMENTS[slug];
}
