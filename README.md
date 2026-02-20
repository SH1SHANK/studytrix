# Studytrix

> **Note**: Studytrix is currently in beta and is actively being developed. You may experience occasional bugs or changes as we continue to improve the platform.

Studytrix is a high-performance, offline-first academic workspace platform built with Next.js 16. It serves as a unified interface for academic resources, orchestrating course catalogs, Google Drive-backed study materials, and rich metadata enrichment into a resilient and searchable learning environment.

The platform is designed to provide seamless access to educational content regardless of network stability, leveraging modern web APIs to provide a "premium" study experience that bridges cloud storage and local persistence.

---

## Project Purpose

Studytrix was developed to solve the friction often associated with navigating fragmented academic storage systems. By providing a centralized, secure proxy to cloud-stored materials and augmenting them with intelligent local features, it enables students and educators to focus on learning rather than logistics.

Key objectives include:
- Providing a secure and efficient gateway to cloud resources without exposing sensitive credentials.
- Ensuring resource availability in low or no connectivity environments.
- Enhancing discoverability through context-aware search and metadata enrichment.
- Supporting batch operations for efficient resource management.

## Maintenance and Sourcing

Studytrix is currently built and maintained by the **Attendrix Team**.

The academic resources accessible via this platform are sourced from the **LaunchPad Community Drive**, which is maintained by the **LaunchPad NITC Community**. We have received explicit permission from senior members of the LaunchPad community to access and proxy these drive files for the Studytrix academic workspace.

---

## Core Systems and Features

### Secure Drive Orchestration
The platform implements a server-only Drive API integration using service account JWTs. Drive folder listings and file streaming are proxied through local API routes, ensuring that cloud credentials never reach the client bundle. This system includes request deduplication and per-IP rate limiting to protect API quotas.

### Offline Persistence Engine
Studytrix features a multi-provider storage abstraction that resolves to either the native FileSystem Access API or IndexedDB based on browser capabilities. This engine manages:
- **Priority Queueing**: Concurrent download management with retry logic.
- **Integrity Verification**: Checksum generation and verification for all local blobs.
- **Sync Invalidation**: Automatic detection of modified remote files against local metadata.
- **Automated Prefetching**: Heuristic-based preloading of sibling or nearby resources.

### Metadata Enrichment Layer
Every file indexed by Studytrix undergoes an enrichment process. Beyond standard file metrics, the system extracts:
- PDF page counts.
- Presentation slide counts (PPTX).
- High-resolution image dimensions.
To ensure performance, enriched metadata is cached with configurable Time-To-Live (TTL) settings.

### Intelligent Navigation and Search
The application features a context-aware Command Center. Search results are filtered based on the user's current scope (Global vs. Local folder scope) to provide relevant navigation and action shortcuts. Furthermore, local text indexing allows for instant discovery of offline-stored materials.

### Bulk Operations
Leveraging `fflate`, the platform supports client-side, memory-efficient ZIP archive generation. This allows users to bundle multiple resources for bulk download or sharing via the native Web Share API.

---

## Technical Architecture

The application follows a service-oriented architecture with clear separation between the server-side proxy layer and the client-side reactive state.

For a comprehensive technical breakdown including Mermaid diagrams and data flow sequences, please refer to the **[Architecture Documentation](./ARCHITECTURE.md)**.

---

## Technology Stack

| Layer | Implementation |
| :--- | :--- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Design System | Tailwind CSS v4, Framer Motion |
| State Management | Zustand |
| Persistence | IndexedDB, FileSystem Access API |
| Cloud Integration | Google Drive API, API Ninjas (Quotes) |
| Caching | Redis (High-performance caching), IDB (Local cache) |
| Performance | Node.js Streams, Concurrent Priority Queues |

---

## Getting Started

### Prerequisites
- **Node.js**: Version 20.x or later.
- **Redis**: Required for production-grade rate limiting and metadata caching.
- **Google Cloud Access**: A service account with Viewer permissions for the target Drive folders.

### Setup and Installation

1. **Clone and Install**:
```bash
git clone https://github.com/sh1shank/studytrix.git
cd studytrix
npm install
```

2. **Configuration**:
Create a `.env.local` file based on `.env.local.example`. Ensure the Google Drive private key preserves line breaks.

3. **Development**:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

---

## For Contributors

We welcome contributions of all types. To maintain code quality and consistency:
- **Consistency**: Follow the existing directory structure and naming conventions.
- **Typing**: Strict TypeScript is enforced; avoid the use of `any` unless absolutely necessary for external API compatibility.
- **Documentation**: Update the relevant `.md` files when introducing or modifying features.
- **Testing**: Ensure that new features are accompanied by appropriate test cases.

---

## Code of Conduct

Studytrix is committed to fostering an open and welcoming environment. By participating in this project, you agree to:
- Be respectful and inclusive of all participants.
- Use welcoming and inclusive language.
- Accept and constructively act on feedback.
- Focus on what is best for the community.

Unacceptable behavior includes harassment, public or private, and any form of exclusionary behavior.

---

## Documentation Index

- [**Features**](./FEATURES.md): Detailed product and platform capabilities.
- [**Architecture**](./ARCHITECTURE.md): System layers, module layouts, and data flow diagrams.
- [**System Context**](./SYSTEM_CONTEXT.md): Runtime behavior and operational contracts.
- [**Visual System**](./VISUAL_SYSTEM.md): Design language, interaction patterns, and motion guidelines.
- [**Contributing**](./CONTRIBUTING.md): Guidelines for community contributions.
- [**Security**](./SECURITY.md): Vulnerability reporting policy.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE.md](./LICENSE.md) file for details.
