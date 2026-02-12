import type { Metadata } from 'next';
import { defaultOpenGraphImage, resolveMetadataBase, siteDescription, siteName, siteTitle, withBasePath } from '@/lib/site';
import './global.css';

const metadataBase = resolveMetadataBase();

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  applicationName: siteName,
  metadataBase,
  alternates: {
    canonical: withBasePath('/en'),
  },
  openGraph: {
    type: 'website',
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: withBasePath('/en'),
    images: [
      {
        url: defaultOpenGraphImage,
        alt: `${siteName} preview`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [defaultOpenGraphImage],
  },
  manifest: '/manifest.webmanifest',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">{children}</body>
    </html>
  );
}
