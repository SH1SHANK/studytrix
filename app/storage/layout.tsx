import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Storage",
  description:
    "Inspect Studytrix offline storage usage, integrity status, file breakdowns, and location configuration.",
  alternates: {
    canonical: "/storage",
  },
};

export default function StorageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
