import { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kursebi.online';

export const metadata: Metadata = {
  title: 'ლექტორები',
  description: 'გაეცანი ჩვენს გამოცდილ ლექტორებს და ინსტრუქტორებს. პროფესიონალები, რომლებიც გაგიზიარებენ თავიანთ ცოდნას და გამოცდილებას.',
  keywords: ['ლექტორები', 'ინსტრუქტორები', 'პროფესიონალები', 'ონლაინ კურსები'],
  openGraph: {
    title: 'ლექტორები | კურსები ონლაინ',
    description: 'გაეცანი ჩვენს გამოცდილ ლექტორებს და ინსტრუქტორებს.',
    url: `${BASE_URL}/instructors`,
    siteName: 'კურსები ონლაინ',
    images: [
      {
        url: `${BASE_URL}/kursebi-logo.png`,
        width: 1200,
        height: 630,
        alt: 'ლექტორები',
      },
    ],
    type: 'website',
    locale: 'ka_GE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ლექტორები | კურსები ონლაინ',
    description: 'გაეცანი ჩვენს გამოცდილ ლექტორებს და ინსტრუქტორებს.',
    images: [`${BASE_URL}/kursebi-logo.png`],
  },
  alternates: {
    canonical: '/instructors',
  },
};

export default function InstructorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
