import { APP_VERSION } from "@/features/version/version";

export interface ChangelogEntry {
  version: string;
  releasedOn: string;
  title: string;
  summary: string;
  highlights: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "0.9.4-experimental",
    releasedOn: "2026-02-23",
    title: "Your Personal Repository, Supercharged",
    summary:
      "Smart Collections, Study Sets, Quick Capture, folder sharing, code file previews, and a lot more — your personal space just became the most powerful part of Studytrix.",
    highlights: [
      "Smart Collections automatically groups your files by topic — open Personal Repository and find your notes already organised by subject, no manual sorting needed.",
      "Study Sets let you bundle files from different folders into one focused list. Perfect for exam week when your material is spread across subjects.",
      "Pin your most-used files to the top of Personal Repository so they're always one tap away, no matter which folder they actually live in.",
      "Quick Capture is here — tap the floating button to snap a photo of handwritten notes, write a quick text note, or record a voice memo. Everything saves to your personal folder instantly.",
      "Create new folders and upload files from your device directly inside Personal Repository. You're no longer limited to importing existing Drive folders.",
      "Share any personal folder with a classmate using a single link. They tap it, Studytrix verifies it, and it drops straight into their Personal Repository.",
      "Code files now open in a full in-app viewer with syntax highlighting — Python, C, C++, Java, MATLAB, VHDL, Jupyter notebooks, and more all supported.",
      "Smart Search now suggests tags for your files automatically based on what they contain. Accept them with a tap and your search results get smarter over time.",
      "Every folder now shows a health badge so you always know if your content is fresh, synced, offline-ready, or needs your attention.",
    ],
  },
  {
    version: "0.9.3-experimental",
    releasedOn: "2026-02-23",
    title: "A Proper Welcome & a Smarter Command Center",
    summary:
      "New users now get a polished onboarding experience, Smart Search understands your personal files too, and searching inside folders now feels far more intuitive.",
    highlights: [
      "First time opening Studytrix? You'll now be walked through a beautiful onboarding experience — swipe through each step, pick your theme with a live preview, and get greeted by name when you're done.",
      "The theme picker now shows a real preview of the app — actual folder cards, file rows, and a search bar — so you know exactly what each theme looks like before you commit.",
      "Smart Search now indexes your Personal Repository files alongside everything else. Search from Command Center and find your personal notes right alongside course content.",
      "Search is now scope-aware — when you're inside a folder, the search bar searches that folder. When you're at the root, it searches everything. No configuration needed.",
      "Searching inside Global Repository can now surface relevant results from your Personal Repository too, shown in a clearly separated section so they never get mixed up.",
      "The Smart Search toggle has moved out of the search bar and into a persistent row below it — cleaner input, always visible, with a clear Experimental label so you know what you're turning on.",
      "Model downloading and file indexing now happen quietly in the background — no blocking dialogs. A small progress indicator below the search bar keeps you informed without getting in the way.",
    ],
  },
  {
    version: "0.9.2-experimental",
    releasedOn: "2026-02-23",
    title: "Introducing Personal Repository",
    summary:
      "Your own space inside Studytrix. Add any Drive folder you have access to — your notes, peer-shared resources, anything you actually study from — and keep it separate from the institution content.",
    highlights: [
      "Personal Repository is a brand new second tab on the dashboard, right alongside the Global Repository. Swipe between them or tap to switch — your position is remembered when you reopen the app.",
      "Add any Google Drive folder to your personal space by pasting a link. Studytrix verifies it, checks permissions, and walks you through a five-stage safety check before adding it.",
      "Each personal folder can be customised with a name, colour, and pinned position so your most important folders always appear first.",
      "Added folders are verified live — you'll see each check animate through in real time, from link format and access permissions all the way to a basic safety scan.",
      "Personal Repository remembers your folders across app restarts and keeps them separate from institution content at all times.",
      "Rename, refresh, or remove any personal folder at any time from the folder's overflow menu.",
    ],
  },
  {
    version: "0.9.1-experimental",
    releasedOn: "2026-02-23",
    title: "Introducing Smart Search — On-Device AI, Completely Private",
    summary:
      "Studytrix can now understand what you're looking for, not just match keywords. The AI model runs entirely on your device — your searches never leave your phone.",
    highlights: [
      "Smart Search uses a lightweight AI model that runs completely on your device. No data is sent to any server. Your search queries stay private, always.",
      "Search by meaning, not just exact words — look for 'oscillation problems' and find files named 'Simple Harmonic Motion Unit 4' because the AI understands the connection.",
      "The model downloads once (~34 MB) and is cached on your device. Every search after that is instant and works fully offline.",
      "Your entire library is indexed in the background — files, folders, and deeply nested content across all departments and semesters.",
      "Smart Search is clearly marked as Experimental. You can turn it on or off at any time from the toggle below the search bar or in Settings.",
      "Settings now has a dedicated Intelligence section where you can check index status, rebuild the index, remove the model to free storage, and learn more about how it works.",
    ],
  },
  {
    version: "0.9.0-experimental",
    releasedOn: "2026-02-21",
    title: "Offline V3 — Downloads Reimagined",
    summary:
      "Downloading files for offline access is now faster, smarter, and more flexible than ever. Pause, resume, download in bulk, zip entire folders, and share directly — all without a connection.",
    highlights: [
      "Downloads now support pause and resume — lose your connection mid-download and pick up exactly where you left off when you're back online.",
      "Select multiple files and download them all at once with the new bulk download action. Up to three files download simultaneously, with the rest queued automatically.",
      "Zip and Download lets you pack an entire folder into a single archive and save it to your device in one tap.",
      "Zip and Share sends a zipped folder directly via your device's share sheet — AirDrop, WhatsApp, email, whatever you prefer.",
      "Copy Drive Link now copies a clean, shareable Google Drive link for any file or folder directly to your clipboard.",
      "Large files (over 25 MB) now show a warning before downloading, and files over 100 MB require explicit confirmation — so you always know what you're about to save.",
      "Downloads automatically retry up to three times if your connection drops, with smarter error messages that tell you exactly what went wrong.",
      "A storage warning now appears when your device is running low on space, and downloads pause automatically at 95% capacity to prevent data loss.",
    ],
  },
  {
    version: "0.8.3",
    releasedOn: "2026-02-21",
    title: "Bug Fixes & Performance Improvements",
    summary:
      "A focused round of fixes and polish across offline access, mobile navigation, file actions, and app discoverability.",
    highlights: [
      "Fixed an issue where offline-saved files would sometimes fail to open after the app was reinstalled or the browser cache was cleared.",
      "Improved the reliability of the floating action dock on mobile — it no longer clips off the edge of the screen on smaller devices.",
      "Fixed a bug where copying a Drive link would produce an incorrect URL for some file types.",
      "Breadcrumb navigation now automatically scrolls to show the current folder when you navigate deep into a structure.",
      "Studytrix is now easier to find and install — improved app icons, better install prompts, and updated metadata across all pages.",
      "General performance improvements and stability fixes across file browsing, offline management, and settings.",
    ],
  },
  {
    version: "0.8.2",
    releasedOn: "2026-02-21",
    title: "Good Morning — Greetings That Actually Mean Something",
    summary:
      "The dashboard header now greets you based on the time of day, your name, and even the weather outside.",
    highlights: [
      "The dashboard now greets you with a time-aware message — something different for early mornings, late nights, and everything in between.",
      "Enabled weather integration pulls live conditions for your location and weaves them into your greeting — a rainy afternoon gets a different message than a clear morning.",
      "Greetings can use your name for a more personal touch, or stay generic if you prefer.",
      "Choose between Motivational and Minimal greeting styles in Settings to match your mood.",
      "All greeting preferences — including weather, name, and style — are configurable under Settings → Appearance → Greeting.",
    ],
  },
  {
    version: "0.8.1",
    releasedOn: "2026-02-21",
    title: "Sharing That Actually Works",
    summary:
      "Zipping and sharing files and folders is now faster, more reliable, and keeps you informed every step of the way.",
    highlights: [
      "Sharing multiple folders at once no longer fails silently — the app now properly prepares all selected content before kicking off the share.",
      "Zip progress is now shown in a clear dialog instead of a toast that disappears too quickly. You can see exactly what's being packed and how far along it is.",
      "If some files can't be included in a zip, you'll now see exactly which ones were skipped and why — no more mystery missing files.",
      "Tapping Share now opens the progress UI immediately, so it feels responsive even before the download has started.",
      "Added a Features overview and Keyboard Shortcuts page — find them in Settings if you ever want a quick reminder of what Studytrix can do.",
      "General sharing and storage stability improvements on mobile and PWA.",
    ],
  },
  {
    version: "0.8.0",
    releasedOn: "2026-02-20",
    title: "Deeper Search, Better Offline",
    summary:
      "The Command Center now finds files buried deep inside nested folders, and offline access covers more of your library than ever before.",
    highlights: [
      "Command Center search now reaches into deeply nested folders — files inside subfolders inside subfolders are all indexed and searchable.",
      "Switching search scope is cleaner and faster, with clearer shortcuts and smarter suggestions based on where you are in the app.",
      "Offline coverage indicators now accurately reflect which nested folders are fully saved, partially saved, or not yet available offline.",
      "The Offline Library is more reliable when syncing changes and diagnosing what's available without a connection.",
      "Smoother interactions across Command Center and storage flows on mobile.",
    ],
  },
  {
    version: "0.7.0",
    releasedOn: "2026-02-16",
    title: "Save Files Where You Want Them",
    summary:
      "You can now choose exactly where Studytrix saves offline files on your device — and move them later if you change your mind.",
    highlights: [
      "Pick any folder on your device as the home for your offline files. Studytrix will save everything there, organised and accessible even outside the app.",
      "Changed your mind about where to save? Migrate your offline library to a new location without losing anything.",
      "If folder permissions are ever revoked — say, after a device restart — Studytrix detects this and walks you through relinking your storage folder in seconds.",
      "Browsers that don't support folder-based storage fall back gracefully so offline features still work everywhere.",
      "Storage location controls are available in Settings → Storage, alongside a dashboard showing how much space your offline library is using.",
    ],
  },
  {
    version: "0.6.0",
    releasedOn: "2026-02-12",
    title: "Make It Yours — Themes & Settings",
    summary:
      "A much more complete settings experience and expanded theme options so Studytrix looks and works exactly how you want it to.",
    highlights: [
      "Settings are now organised into clear categories — no more scrolling past unrelated options to find what you need.",
      "Expanded theme selection with more visual styles to choose from, covering both light and dark preferences.",
      "Every setting now has clearer labels and descriptions so you always know what you're changing.",
      "Settings pages are more consistent across the app — the same interaction patterns everywhere, no surprises.",
      "Navigating between settings sections is faster and more discoverable.",
    ],
  },
  {
    version: "0.5.0",
    releasedOn: "2026-02-08",
    title: "Offline, For Real This Time",
    summary:
      "The foundation that makes Studytrix work without a connection — reliable, predictable, and built to handle the messiness of real mobile networks.",
    highlights: [
      "Studytrix now uses a Service Worker to manage offline access properly — files you've saved are served from your device, not the network.",
      "Content is cached intelligently so the right files are available offline without wasting storage on things you haven't touched.",
      "Opening a file you've saved offline now works reliably, even if you haven't launched the app in a while.",
      "Connectivity changes — going from WiFi to mobile data to no signal — no longer interrupt or corrupt ongoing operations.",
      "Spotty connections are handled more gracefully across the board, with smarter retry behaviour when the network comes and goes.",
    ],
  },
  {
    version: "0.4.0",
    releasedOn: "2026-02-04",
    title: "Tags & Multi-Select",
    summary:
      "Organise your files with tags, act on multiple items at once, and get more done with fewer taps.",
    highlights: [
      "Tags are now a first-class feature — create tags, apply them to files and folders, and filter your library by tag from anywhere in the app.",
      "Select multiple files and folders at once and apply tags, download, or take other actions on all of them in one go.",
      "File and folder action menus have been expanded with more options and better organisation, so common actions are always within reach.",
      "Actions work consistently whether you're in grid view or list view — no missing options depending on how you're browsing.",
      "Download and file management actions are more reliable and surface better feedback when something completes or fails.",
    ],
  },
  {
    version: "0.3.0",
    releasedOn: "2026-01-31",
    title: "Downloads & Command Center",
    summary:
      "A proper download manager and a more capable Command Center — two of the most important parts of the app, now much more useful.",
    highlights: [
      "Downloads now have a dedicated manager where you can see what's downloading, what's finished, and what failed — all in one place.",
      "Command Center results are more relevant and easier to act on, with better organisation between files, folders, and actions.",
      "Downloading a file now tracks through clearly defined states — queued, downloading, complete, failed — with no ambiguity about what's happening.",
      "Frequently accessed files are easier to mark and access offline directly from the app.",
      "Storage tools have been expanded so you have more visibility into what's saved on your device.",
    ],
  },
  {
    version: "0.2.0",
    releasedOn: "2026-01-24",
    title: "The App Takes Shape",
    summary:
      "The visual and interactive foundation of Studytrix — the components, patterns, and design language that every feature is built on.",
    highlights: [
      "Established the core design system — buttons, menus, forms, dialogs, and feedback states are all consistent and reusable across the app.",
      "The visual experience is now consistent end-to-end, with the same look and feel whether you're browsing files, managing settings, or using Command Center.",
      "Accessibility improvements across interactive components — better focus states, touch targets, and screen reader support.",
      "Internal component architecture cleaned up significantly, which means faster development and fewer inconsistencies going forward.",
    ],
  },
  {
    version: "0.1.0",
    releasedOn: "2026-01-18",
    title: "Studytrix Is Here",
    summary:
      "The very first version. Browse your institution's study materials, open files, and get a feel for what Studytrix is becoming.",
    highlights: [
      "Browse your institution's Global Repository — departments, semesters, subjects, and files, all in one place.",
      "Open and preview files directly in the app without leaving to another viewer.",
      "Studytrix is a Progressive Web App — install it on your home screen on any device and use it like a native app.",
      "The foundation is set. Everything from here is built on top of this — offline access, Smart Search, Personal Repository, and everything still to come.",
    ],
  },
];

export const LATEST_CHANGELOG_ENTRY = CHANGELOG_ENTRIES[0];

export const IS_VERSION_DECLARATION_SYNCED =
  LATEST_CHANGELOG_ENTRY.version === APP_VERSION;

export function getChangelogByVersion(version: string): ChangelogEntry | null {
  return CHANGELOG_ENTRIES.find((entry) => entry.version === version) ?? null;
}
