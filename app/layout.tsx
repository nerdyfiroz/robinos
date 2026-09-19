import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://robinos.xyz'),
  title: 'ROBINOS NFT Early Access Platform',
  description: 'Premium ROBINOS NFT Early Access Platform with dynamic quest engine, proof verification, applicant approval, and real-time admin management.',
  openGraph: {
    title: 'ROBINOS NFT Early Access Platform',
    description: 'Bring Onchain Culture Back. 5,555 Supply · 0.0004 ETH · Robinhood Chain · OpenSea',
    type: 'website',
    images: ['/3.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/3.png'],
  },
  icons: {
    icon: '/3.png',
    apple: '/3.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&family=VT323&family=Space+Grotesk:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0b0e14] text-[#f0fdf4] selection:bg-[#facc15] selection:text-[#121820] antialiased overflow-x-hidden w-full">
        {children}
      </body>
    </html>
  );
}

