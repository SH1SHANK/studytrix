import type { Metadata } from "next";

type TagRouteLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tagId: string }>;
};

export async function generateMetadata({ params }: TagRouteLayoutProps): Promise<Metadata> {
  const { tagId } = await params;
  const decodedTag = decodeURIComponent(tagId).trim();
  const label = decodedTag || "Tag";
  const canonicalPath = `/tags/${encodeURIComponent(decodedTag || tagId)}`;

  return {
    title: `${label} Tag`,
    description:
      `Browse files and folders assigned to the ${label} tag in Studytrix.`,
    alternates: {
      canonical: canonicalPath,
    },
  };
}

export default function TagRouteLayout({ children }: Readonly<TagRouteLayoutProps>) {
  return children;
}
