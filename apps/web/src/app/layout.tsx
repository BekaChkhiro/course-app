import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  fallback: ['Helvetica', 'Arial', 'sans-serif'],
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kursebi.ge'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'კურსები ონლაინ | ონლაინ სასწავლო პლატფორმა',
    template: '%s | კურსები ონლაინ',
  },
  description: 'პროფესიონალური ონლაინ კურსები საუკეთესო ინსტრუქტორებისგან. შეისწავლე ახალი უნარები და განავითარე კარიერა.',
  keywords: ['ონლაინ კურსები', 'სწავლა', 'განათლება', 'პროფესიული განვითარება', 'კურსები', 'ელექტრონული სწავლება'],
  authors: [{ name: 'კურსები ონლაინ' }],
  creator: 'კურსები ონლაინ',
  publisher: 'კურსები ონლაინ',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    url: BASE_URL,
    siteName: 'კურსები ონლაინ',
    title: 'კურსები ონლაინ | ონლაინ სასწავლო პლატფორმა',
    description: 'პროფესიონალური ონლაინ კურსები საუკეთესო ინსტრუქტორებისგან. შეისწავლე ახალი უნარები და განავითარე კარიერა.',
    images: [
      {
        url: '/kursebi-logo.png',
        width: 1200,
        height: 630,
        alt: 'კურსები ონლაინ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'კურსები ონლაინ | ონლაინ სასწავლო პლატფორმა',
    description: 'პროფესიონალური ონლაინ კურსები საუკეთესო ინსტრუქტორებისგან.',
    images: ['/kursebi-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'googlef7fa6b5735174f3d',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ka">
      <body className={roboto.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
