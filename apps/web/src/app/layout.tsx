import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import Script from 'next/script'
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
      <head>
        {/* Preconnect to API for faster data fetching */}
        <link rel="preconnect" href="https://api.kursebi.online" crossOrigin="use-credentials" />
        <link rel="dns-prefetch" href="https://api.kursebi.online" />
        {/* DNS prefetch for R2 storage (images load after initial render) */}
        <link rel="dns-prefetch" href="https://pub-127e61ff74f84adea4c690cc17c555af.r2.dev" />

        {/* Meta Pixel Code - Delayed load for better mobile performance */}
        <Script
          id="meta-pixel"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(function() {
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '1578568346415301');
                fbq('track', 'PageView');
              }, 3000);
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1578568346415301&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* Tidio Chat Widget */}
        <Script
          id="tidio-chat"
          src="//code.tidio.co/pghqt1ogrs5afpw6cb4blxo3ivscwysi.js"
          strategy="lazyOnload"
        />
      </head>
      <body className={roboto.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
