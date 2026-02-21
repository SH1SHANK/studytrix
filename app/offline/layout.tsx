import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  description:
    "Offline status surface for Studytrix with quick navigation to your downloaded offline library.",
  alternates: {
    canonical: "/offline",
  },
};

export default function OfflineLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
