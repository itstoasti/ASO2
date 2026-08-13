import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { generateJsonLdSchema } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  title: 'ASO Keyword Research Tool | Apple App Store & Google Play Analytics 2026',
  description: 'Discover high-opportunity keywords, official Apple Search Ads popularity metrics, and competitive difficulty for iOS App Store and Android Google Play Store.',
  icons: {
    icon: [
      { url: '/logo-clean.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/logo-clean.png',
    apple: '/logo-clean.png',
  },
  keywords: [
    'ASO keyword research',
    'App Store Optimization',
    'Apple Search Ads popularity',
    'Google Play keyword volume',
    'ASO difficulty score',
    'app store keyword tool',
    'app marketing intelligence',
  ],
  authors: [{ name: 'ASO Analytics' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ASO Tool',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'ASO Keyword Research Tool | App Store & Google Play Intelligence',
    description: 'Discover high-opportunity keywords, official Apple Search Ads popularity metrics, and competitive difficulty.',
    type: 'website',
    url: 'https://aso-keyword-research.app',
    siteName: 'ASO Keyword Research',
    images: [{ url: '/logo-clean.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ASO Keyword Research Tool',
    description: 'Discover high-opportunity keywords for App Store and Google Play.',
    images: ['/logo-clean.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = generateJsonLdSchema();

  return (
    <html lang="en" className="light">
      <head>
        <link rel="icon" href="/logo-clean.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/logo-clean.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-clean.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
