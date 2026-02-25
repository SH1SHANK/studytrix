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
    description:
      "The terms and conditions governing your access to and use of Studytrix.",
    version: "1.1.0",
    effectiveDate: "February 25, 2026",
    lastUpdated: "February 25, 2026",
    contactEmail: CONTACT_EMAIL,
    jurisdiction: JURISDICTION,
    sections: [
      {
        heading: "1. About This Project",
        paragraphs: [
          "Studytrix is an open-source academic workspace application developed and maintained by a solo independent developer based at the National Institute of Technology Calicut (NIT Calicut), Kozhikode, Kerala, India. The project is not affiliated with, endorsed by, or operated by NIT Calicut or any academic institution.",
          "The source code for Studytrix is publicly available and distributed under the MIT License. You are free to inspect, fork, modify, and self-host the software in accordance with the terms of that licence. A copy of the MIT License is available in the project repository.",
          "These Terms of Service apply to the hosted instance of Studytrix available at this URL. If you are running your own self-hosted instance, these Terms do not apply to your deployment — you are responsible for your own terms of service in that case.",
        ],
      },
      {
        heading: "2. Acceptance of Terms",
        paragraphs: [
          "By accessing or using this hosted instance of Studytrix, you agree to be bound by these Terms. If you do not agree, please discontinue use. These Terms may be updated at any time and continued use constitutes acceptance of the revised Terms.",
          "Given that this is a solo developer project maintained in personal capacity, these Terms are provided in good faith and on a best-efforts basis. They are not a substitute for professional legal advice.",
        ],
      },
      {
        heading: "3. Nature of the Service",
        paragraphs: [
          "Studytrix is provided as a free, open-source tool for academic productivity. It is a Progressive Web Application (PWA) that operates primarily on your device using local browser storage. No account creation, registration, or authentication is required to use the Service.",
          "The Service is developed and maintained by a single developer as a personal and academic project. It is offered without any guarantee of uptime, continuity, or long-term maintenance. The developer reserves the right to modify, suspend, or discontinue the Service at any time without notice.",
          "Studytrix is currently in active development and beta. Interfaces, features, and behaviour may change frequently without prior notice.",
        ],
      },
      {
        heading: "4. MIT Licence and Open Source",
        paragraphs: [
          'The source code of Studytrix is released under the MIT License ("Licence"). The Licence permits any person to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, subject to the condition that the original copyright notice and the Licence text are included in all copies or substantial portions of the software.',
          'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHOR OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
          "These Terms of Service govern use of the hosted instance only and do not restrict any rights granted to you under the MIT License with respect to the source code.",
        ],
      },
      {
        heading: "5. Permitted and Prohibited Use",
        paragraphs: [
          "You may use the Service for personal, educational, and non-commercial purposes. You may access, organise, and manage academic content for your own study.",
          "You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to interfere with, disrupt, or gain unauthorised access to the Service or its infrastructure; (c) use the Service to distribute content that infringes third-party intellectual property rights; or (d) use automated scraping tools or bots against the hosted instance in a manner that places unreasonable load on the service.",
          "As an open-source project, you are welcome to self-host, fork, and adapt the software freely under the MIT License. Contributions to the project via pull requests or issue reports are also welcome.",
        ],
      },
      {
        heading: "6. Third-Party Services",
        paragraphs: [
          "The Service integrates with third-party platforms including Google Drive (for content access) and Google Gemini (for optional document summarisation). Use of these integrations is subject to the respective terms of service and privacy policies of those platforms. The developer is not responsible for the availability or behaviour of third-party services.",
          "The on-device AI model used for semantic search is sourced from Hugging Face. Downloading the model constitutes a direct request to Hugging Face infrastructure and is subject to their terms.",
        ],
      },
      {
        heading: "7. Limitation of Liability",
        paragraphs: [
          "Studytrix is a solo developer open-source project provided without charge and without warranty. To the maximum extent permitted by applicable law, the developer shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of or inability to use the Service, including but not limited to loss of data or loss of study materials.",
          "Given the local-first architecture of the Service, the developer has no access to your data and therefore no ability to recover it in the event of local storage loss. You are solely responsible for maintaining backups of any content you consider important.",
        ],
      },
      {
        heading: "8. Governing Law",
        paragraphs: [
          "These Terms are governed by the laws of India. Any disputes arising from these Terms shall be subject to the jurisdiction of the courts in Kozhikode, Kerala, India.",
        ],
      },
      {
        heading: "9. Contact",
        paragraphs: [
          `For questions or concerns about these Terms, please reach out at ${CONTACT_EMAIL}. As a solo developer project, response times may vary.`,
        ],
      },
    ],
  },

  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    description:
      "How Studytrix handles your data — written plainly for an open-source, local-first application.",
    version: "1.1.0",
    effectiveDate: "February 25, 2026",
    lastUpdated: "February 25, 2026",
    contactEmail: CONTACT_EMAIL,
    jurisdiction: JURISDICTION,
    sections: [
      {
        heading: "1. Who is Responsible for This Policy",
        paragraphs: [
          "Studytrix is an open-source project developed by a solo independent developer based at NIT Calicut, Kozhikode, Kerala, India. This Privacy Policy reflects the actual data practices of the hosted instance of the application.",
          "This project is not affiliated with NIT Calicut or any institution. It is maintained in personal capacity. This Policy is written plainly and honestly — not to satisfy a legal department, but to clearly explain what happens to your data.",
        ],
      },
      {
        heading: "2. The Short Version",
        paragraphs: [
          "Almost everything stays on your device. The developer does not collect your name, email, files, search queries, or any personally identifying information. The app does not have a user database. There are no analytics, no ad tracking, and no third-party trackers of any kind.",
          "A small number of features make server-side requests (folder verification, file streaming, PDF summarisation) — these are described in detail below. None of these requests include information that identifies you as an individual.",
        ],
      },
      {
        heading: "3. Data Stored Locally on Your Device",
        paragraphs: [
          "The Service stores the following exclusively on your device using IndexedDB and localStorage: application settings and preferences; onboarding personalisation fields (name, theme selection — never sent to any server); cached folder and file metadata from Google Drive for offline use; Personal Repository configuration; the on-device AI model binary and generated search index; Quick Capture content (photos, notes, voice recordings); and offline file blobs.",
          "This data never leaves your device as part of normal application operation. The developer has no access to it and no ability to retrieve or recover it.",
        ],
      },
      {
        heading: "4. Server-Side Requests",
        paragraphs: [
          "Global Repository: Folder and file listings are fetched via a server-side Google Drive service account. These requests contain no user identity information. The responses are cached locally on your device.",
          "File Downloads: When you download a file for offline access, the file is streamed through the server from Google Drive to your device. File content is not stored on the server at any point.",
          "Personal Repository Verification: When you add a Drive folder by pasting a link, the extracted folder ID is sent to the server to verify accessibility via the Drive API. No personal information is transmitted.",
          "PDF Summarisation: The optional summarisation feature sends extracted PDF text (up to 8,000 characters) to Google Gemini via the server. This text is not stored server-side after the API call completes. This feature is opt-in and only runs when you explicitly request a summary.",
          "AI Model Download: The on-device AI model is fetched from Hugging Face CDN on first use of Smart Search. This is a direct HTTPS download. Your IP address may be visible to Hugging Face per their infrastructure logging. The model is cached locally and not re-downloaded on subsequent sessions.",
        ],
      },
      {
        heading: "5. No Analytics, No Tracking, No Ads",
        paragraphs: [
          "This application contains no analytics SDK, no error tracking service, no advertising network integration, and no telemetry of any kind. The developer does not know how many people use the app, which features are used, or anything about individual usage patterns.",
          "There are no cookies used for tracking. There are no third-party scripts loaded from advertising or analytics domains.",
        ],
      },
      {
        heading: "6. Open Source Transparency",
        paragraphs: [
          "Because Studytrix is open source under the MIT License, you can verify every claim in this Privacy Policy by reading the source code. The server-side API routes, the data flow, and the local storage implementation are all publicly visible in the project repository.",
          "If you identify a discrepancy between this Policy and the actual code behaviour, please raise an issue in the project repository or contact the developer directly.",
        ],
      },
      {
        heading: "7. Data Deletion",
        paragraphs: [
          "All locally stored data can be deleted at any time by clearing browser storage, uninstalling the PWA, or using the in-app storage management controls under Settings. Because the developer holds no copy of your data, there is nothing to request deletion of on a server.",
          "iOS Safari may automatically delete locally stored data after 7 days of inactivity for web apps not installed to the home screen. Installing Studytrix as a PWA prevents this automatic eviction.",
        ],
      },
      {
        heading: "8. Children's Privacy",
        paragraphs: [
          "The Service is not directed at children under the age of 13. The developer does not knowingly collect any information from children under 13. If you have concerns, please contact the developer at the email below.",
        ],
      },
      {
        heading: "9. Changes to This Policy",
        paragraphs: [
          "This Policy may be updated as the application evolves. The effective date at the top of the document will reflect the most recent revision. As an open-source project, all changes to this document are visible in the project repository's commit history.",
        ],
      },
      {
        heading: "10. Contact",
        paragraphs: [
          `For privacy-related questions, please contact ${CONTACT_EMAIL}. This is a solo developer project — responses may take a few days.`,
        ],
      },
    ],
  },

  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    description:
      "Important disclosures about the limitations and risks of using Studytrix.",
    version: "1.1.0",
    effectiveDate: "February 25, 2026",
    lastUpdated: "February 25, 2026",
    contactEmail: CONTACT_EMAIL,
    jurisdiction: JURISDICTION,
    sections: [
      {
        heading: "1. Open Source Project Disclaimer",
        paragraphs: [
          "Studytrix is an independent open-source project developed by a solo developer in personal capacity at NIT Calicut, Kozhikode, Kerala, India. It is not an official product, and is not affiliated with, endorsed by, or supported by NIT Calicut, any academic institution, or any commercial organisation.",
          "The software is distributed under the MIT License. As stated in that licence, the software is provided without warranty of any kind. Use of the hosted instance or the source code is entirely at your own risk.",
          "This is a student and developer side project. It is maintained on a best-efforts basis alongside academic commitments. There is no dedicated support team, no SLA, and no guarantee of uptime or continued development.",
        ],
      },
      {
        heading: "2. AI Features Disclaimer",
        paragraphs: [
          "The Smart Search feature uses an on-device AI embedding model to provide semantically relevant results. This is experimental. Results may be inaccurate, irrelevant, or misleading. The model has no awareness of your institution's curriculum, syllabus, or examination pattern and should not be relied upon as academically authoritative.",
          "The document summarisation feature uses Google Gemini, a third-party large language model. AI-generated summaries may contain factual errors, omissions, or misrepresentations of the source content. Do not use AI-generated summaries as a substitute for reading the original material, especially for examinations or graded assessments.",
          "AI features in Studytrix are provided as convenience tools only. The developer makes no representations about their accuracy or suitability for any academic purpose.",
        ],
      },
      {
        heading: "3. Local Storage and Data Loss",
        paragraphs: [
          "The Service stores personal workspace data, downloaded files, and settings locally on your device. This data is not backed up to any server. It can be lost permanently due to: clearing browser storage; uninstalling the PWA; storage quota eviction by the browser or operating system; device failure or reset; and iOS Safari's 7-day inactivity eviction policy for non-installed web apps.",
          "The developer has no ability to recover lost local data. You are solely responsible for maintaining independent backups of any study materials you consider important.",
        ],
      },
      {
        heading: "4. Academic Content",
        paragraphs: [
          "Content accessible through the Global Repository is provided by your institution or its administrators. The developer does not curate, verify, or take responsibility for the accuracy, completeness, or currency of that content. Always cross-reference academic materials with official sources from your institution.",
        ],
      },
      {
        heading: "5. No Warranty",
        paragraphs: [
          'AS STATED IN THE MIT LICENSE UNDER WHICH THIS SOFTWARE IS DISTRIBUTED: THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
        ],
      },
    ],
  },

  "data-handling": {
    slug: "data-handling",
    title: "Data Handling Policy",
    description:
      "A transparent technical explanation of how Studytrix stores and processes data, written for an open-source local-first PWA.",
    version: "1.1.0",
    effectiveDate: "February 25, 2026",
    lastUpdated: "February 25, 2026",
    contactEmail: CONTACT_EMAIL,
    jurisdiction: JURISDICTION,
    sections: [
      {
        heading: "1. Philosophy",
        paragraphs: [
          "Studytrix is built on a local-first principle: your data belongs to you and should live on your device. The application is designed so that the developer — a single person — never has access to your files, your notes, your search queries, or your personal information. This is not just a policy commitment; it is reflected in the technical architecture.",
          "Because the project is open source under the MIT License, every data handling claim in this document can be verified by reading the source code in the public repository.",
        ],
      },
      {
        heading: "2. Local Storage Architecture",
        paragraphs: [
          "IndexedDB is the primary persistent store. It holds: offline file blobs downloaded from Google Drive; folder and file metadata cached from Drive API responses; the semantic search embedding vectors generated by the on-device AI model; download task history and status; Personal Repository configuration; and Quick Capture media content (photos, text notes, voice recordings).",
          "localStorage holds: application settings and feature toggles; onboarding state; user personalisation preferences; study set and pinned file configuration; and smart collection state.",
          "The Cache Storage API, managed by the Service Worker, holds: application shell assets (JavaScript, CSS, fonts, icons) required for offline PWA operation. It does not cache Google Drive file content.",
        ],
      },
      {
        heading: "3. What the Server Actually Does",
        paragraphs: [
          "The server component of Studytrix is intentionally minimal. It exists primarily as a secure proxy to avoid exposing Google Drive service account credentials in the client application. It performs the following operations and nothing more.",
          "Drive Folder Listing Proxy: Accepts a folder ID from the client, queries the Google Drive API using a service account, and returns the folder contents. No user information is logged or stored.",
          "File Stream Proxy: Streams a requested file from Google Drive to the client device. The file is not written to server storage at any point in this process.",
          "Custom Folder Verification: Accepts a Drive folder ID, queries the Drive API to check accessibility and retrieve basic metadata, and returns the result. No user information is logged.",
          "PDF Summarisation: Accepts extracted PDF text from the client, forwards it to the Google Gemini API, and returns the generated summary. The text payload is not persisted after the API call completes. This is the only server-side operation that processes document content, and it only runs when explicitly invoked by the user.",
        ],
      },
      {
        heading: "4. On-Device AI",
        paragraphs: [
          "The Smart Search feature uses the bge-small-en-v1.5 embedding model, which runs entirely within a Web Worker in your browser. The model processes file metadata — folder paths, filenames, file types, and user-applied tags — to generate vector representations stored locally in IndexedDB.",
          "No search queries, no file metadata, and no embedding vectors are ever transmitted to an external server as part of this feature. The model binary (~34MB) is downloaded once from Hugging Face CDN and cached in the browser. All subsequent inference runs locally.",
        ],
      },
      {
        heading: "5. Service Worker Scope",
        paragraphs: [
          "The registered Service Worker intercepts network requests to serve cached application assets when offline. It is explicitly configured to not intercept Google Drive file stream requests, ensuring that file downloads always retrieve fresh content and are not served from a potentially stale cache.",
          "The Service Worker uses a BroadcastChannel to notify the main application thread when new files are cached, which triggers background updates to the local semantic search index.",
        ],
      },
      {
        heading: "6. Storage Limits and Eviction Risk",
        paragraphs: [
          "Browser storage is not guaranteed to be permanent. The amount of storage available varies by device and browser. The browser or operating system may evict locally stored data under storage pressure without warning.",
          "iOS Safari applies a 7-day inactivity eviction policy to web app storage for apps not saved to the home screen. Installing Studytrix as a PWA (Add to Home Screen) prevents this and requests persistent storage from the browser. Installing the PWA is strongly recommended for regular users.",
          "Private or incognito browsing sessions do not persist data between sessions. Using Studytrix in private mode will result in data loss when the session ends.",
        ],
      },
      {
        heading: "7. Compliance Note",
        paragraphs: [
          "This is a solo developer open-source project. It is operated with awareness of and good-faith effort to comply with applicable Indian law, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023. The local-first, no-account architecture means the application collects minimal personal data by design.",
          "If you have compliance concerns or questions about how the application handles data in your specific institutional context, please contact the developer and review the source code directly.",
          `Contact: ${CONTACT_EMAIL}`,
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
