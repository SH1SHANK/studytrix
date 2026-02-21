import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Downloads",
  description:
    "Track download progress, manage completed files, and review offline transfer diagnostics in Studytrix.",
  alternates: {
    canonical: "/downloads",
  },
};

export default function DownloadsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
