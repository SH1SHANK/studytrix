import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline Library",
  description:
    "Browse and open files available locally in Studytrix when you are offline or on unstable networks.",
  alternates: {
    canonical: "/offline-library",
  },
};

export default function OfflineLibraryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
