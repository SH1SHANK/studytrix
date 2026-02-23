import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "AI Cleanup Engine: Denoising OCR Text with T5",
  description:
    "Learn how Studytrix uses an on-device T5 language model to clean up OCR artifacts in scanned documents.",
  alternates: {
    canonical: "/blog/cleanup-engine",
  },
};

export default function CleanupEnginePage() {
  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <article className="px-4 py-5 sm:px-5">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>February 22, 2026</span>
            <span aria-hidden="true">·</span>
            <Badge variant="outline" className="border-border/70 bg-muted/40">Feature</Badge>
            <Badge variant="outline" className="border-violet-500/30 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300">AI</Badge>
            <span aria-hidden="true">·</span>
            <span>5 min read</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            AI Cleanup Engine: Denoising OCR Text with T5
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Scanned lecture notes and handwritten documents often produce messy OCR output — broken words,
            garbled characters, and missing punctuation. The new Cleanup Engine uses a T5 language model
            running entirely on your device to fix these artifacts before the text reaches your clipboard.
          </p>
        </header>

        <section className="mt-4 space-y-5 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-foreground">Why OCR Text Needs Cleanup</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Optical character recognition (OCR) is remarkably good at converting images to text, but it's
              not perfect. Common issues include:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li className="list-disc">
                <strong>Character substitution</strong> — "rn" misread as "m", "I" confused with "l" or "1"
              </li>
              <li className="list-disc">
                <strong>Word breaks</strong> — "photo synthesis" instead of "photosynthesis"
              </li>
              <li className="list-disc">
                <strong>Missing punctuation</strong> — Periods, commas, and apostrophes dropped
              </li>
              <li className="list-disc">
                <strong>Random noise</strong> — Stray characters from smudges, underlines, or page edges
              </li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              These errors make the extracted text harder to read, harder to search, and harder to paste into
              your notes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">How the Cleanup Engine Works</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              When you use Copy Contents on a scanned document, the pipeline has two stages:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong>OCR extraction</strong> — Tesseract.js reads the image and produces raw text with a
                confidence score.
              </li>
              <li>
                <strong>AI denoising</strong> — The raw text is sent to a T5 model (running in a Web Worker)
                with the prompt <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">fix errors:</code>.
                This instruction tells the model to correct mistakes without creative paraphrasing.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Model Options</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You can choose your cleanup engine tier in Settings → Intelligence → Cleanup Engine:
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-4">Tier</th>
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2 pr-4">Size</th>
                    <th className="pb-2">Best For</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">Lite</td>
                    <td className="py-2 pr-4">T5 Tiny (q4)</td>
                    <td className="py-2 pr-4">~15 MB</td>
                    <td className="py-2">Fast corrections on low-end devices. Great for quick fixes.</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">Balanced</td>
                    <td className="py-2 pr-4">T5 Small (q4)</td>
                    <td className="py-2 pr-4">~40 MB</td>
                    <td className="py-2">Good balance of speed and quality. Recommended for most users.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium text-foreground">Pro</td>
                    <td className="py-2 pr-4">BART Base CNN (q4)</td>
                    <td className="py-2 pr-4">~100 MB</td>
                    <td className="py-2">Highest quality. Better at fixing complex sentence structure.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              All models use 4-bit quantization to keep the download small. Once downloaded, models are cached
              in your browser so they work offline forever.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Safety Guardrails</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Language models can sometimes "hallucinate" — generating text that wasn't in the original.
              Studytrix has several guardrails to prevent this:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li className="list-disc">
                <strong>Temperature 0</strong> — The model produces deterministic output instead of creative variations.
              </li>
              <li className="list-disc">
                <strong>Repetition penalty 1.2</strong> — Prevents the model from getting stuck in loops.
              </li>
              <li className="list-disc">
                <strong>Length sanity check</strong> — If the AI output is significantly shorter than the input
                (below 40% of the original length), Studytrix falls back to the original OCR text to prevent
                data loss.
              </li>
              <li className="list-disc">
                <strong>Graceful fallback</strong> — If the cleanup model fails to load or produces an error, the
                original OCR text is used and you're notified that the fallback was applied.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">WebGPU Acceleration</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              On supported browsers, the Cleanup Engine uses WebGPU for hardware-accelerated inference.
              This means the T5 Tiny model can process text in roughly 20-50 milliseconds once loaded.
              If WebGPU is not available, the engine automatically falls back to WebAssembly (WASM),
              which is slightly slower but universally supported.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Privacy</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Like all intelligence features in Studytrix, the Cleanup Engine runs entirely on your device.
              Your text is never sent to any server. The model download happens once (from Hugging Face's CDN),
              and after that, everything works offline.
            </p>
          </section>

          <aside className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-foreground">
            <p>
              Choose your cleanup engine tier in <strong>Settings → Intelligence → Cleanup Engine</strong>.
              The model downloads automatically the first time you use Copy Contents on a scanned file.
            </p>
          </aside>
        </section>

        <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
          <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            ← All articles
          </Link>
          <Link href="/blog/offline-v3" className="font-medium text-primary transition-colors hover:text-primary/80">
            Next: Offline Mode v3 →
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
