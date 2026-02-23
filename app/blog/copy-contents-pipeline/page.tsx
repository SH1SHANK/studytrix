import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Introducing Copy Contents: Extract Text from Any File",
  description:
    "Learn how the new Copy Contents feature extracts full text from PDFs, Word docs, presentations, and scanned images — all on-device.",
  alternates: {
    canonical: "/blog/copy-contents-pipeline",
  },
};

export default function CopyContentsPipelinePage() {
  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <article className="px-4 py-5 sm:px-5">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>February 23, 2026</span>
            <span aria-hidden="true">·</span>
            <Badge variant="outline" className="border-border/70 bg-muted/40">Feature</Badge>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">New</Badge>
            <span aria-hidden="true">·</span>
            <span>5 min read</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Introducing Copy Contents: Extract Text from Any File
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Students share files in every format imaginable — scanned handwritten notes, lecture slide decks,
            professor-uploaded PDFs, and Word documents. The new Copy Contents action lets you extract text from
            any supported file and paste it wherever you need it. No third-party apps required.
          </p>
        </header>

        <section className="mt-4 space-y-5 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-foreground">The Problem</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You're reviewing a scanned PDF of last week's lecture. You want to paste a specific paragraph
              into your notes app, but the text isn't selectable — the PDF is just an image. You could
              retype it by hand, but that wastes time and introduces mistakes.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Or you receive a PowerPoint with dense slides. All you need is the raw text so you can
              reorganise it in your own format. Opening the file, selecting slide by slide, and copying
              is tedious.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">How Copy Contents Works</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              When you open the action menu (the three-dot icon on any file), you'll see a new option called
              <strong> Copy Contents</strong>. One tap starts the extraction pipeline:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>File Download</strong> — Studytrix fetches the file from your connected drive.
                This works even if the file is cloud-only; no need to make it available offline first.
              </li>
              <li>
                <strong>Format Detection</strong> — The pipeline identifies the file type (PDF, DOCX, PPTX,
                or image) and routes it to the correct extractor.
              </li>
              <li>
                <strong>Native Text Extraction</strong> — For PDFs with embedded text, Word documents, and
                presentations, text is extracted directly from the file structure. Every page and every slide
                is processed — there is no character limit.
              </li>
              <li>
                <strong>OCR Fallback</strong> — If a PDF turns out to be scanned (image-based), or if the file
                is a photo, the pipeline automatically switches to optical character recognition (OCR) using
                Tesseract.js. This runs entirely on your device.
              </li>
              <li>
                <strong>Text Cleaning</strong> — The extracted text is cleaned: control characters are stripped,
                excessive whitespace is collapsed, and each line is trimmed. The result is a clean, pasteable block
                of text.
              </li>
              <li>
                <strong>Clipboard</strong> — The cleaned text is copied to your clipboard automatically.
                You'll see a success toast confirming it.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Supported File Types</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-4">Format</th>
                    <th className="pb-2 pr-4">Method</th>
                    <th className="pb-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">PDF</td>
                    <td className="py-2 pr-4">Native text + OCR fallback</td>
                    <td className="py-2">All pages extracted. If no selectable text is found, OCR runs on every page at 2× resolution.</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">DOCX</td>
                    <td className="py-2 pr-4">Native text</td>
                    <td className="py-2">Full document content extracted, including body text and headers.</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">PPTX</td>
                    <td className="py-2 pr-4">Slide XML parsing</td>
                    <td className="py-2">Text is pulled from every slide in order. Speaker notes are not included.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-foreground">Images</td>
                    <td className="py-2 pr-4">OCR (Tesseract.js)</td>
                    <td className="py-2">JPEG, PNG, WebP, and GIF. Works best on typed text and clear handwriting.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Confidence Warnings</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              OCR is not perfect, especially with messy handwriting or low-resolution scans. When the OCR engine
              reports low confidence (below 70%), Studytrix will show a gentle warning:
            </p>
            <div className="mt-3 rounded-xl border border-amber-300/50 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Content copied — some parts may be inaccurate (scanned document)
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This means the text was successfully copied but you should double-check important parts.
              If extraction fails entirely (for example, a purely graphical PDF with no text at all),
              you'll get a clear error message instead.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Privacy</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The entire extraction pipeline runs on your device. Your file content never leaves your browser.
              PDFs are parsed using PDF.js, Word documents via Mammoth.js, and OCR via Tesseract.js — all
              client-side libraries. No data is sent to any external server.
            </p>
          </section>

          <aside className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-foreground">
            <p>
              <strong>Try it now:</strong> Open any file in your library, tap the three-dot menu, and select
              <strong> Copy Contents</strong>. The action only appears for supported file types.
            </p>
          </aside>
        </section>

        <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
          <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            ← All articles
          </Link>
          <Link href="/blog/command-center" className="font-medium text-primary transition-colors hover:text-primary/80">
            Next: The Command Center →
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
