import { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kursebi.ge';

export const metadata: Metadata = {
  title: 'კურსების კატალოგი',
  description: 'იპოვე შენთვის საუკეთესო ონლაინ კურსი. პროფესიონალური კურსები პროგრამირების, დიზაინის, მარკეტინგისა და სხვა მიმართულებებით.',
  keywords: ['ონლაინ კურსები', 'კურსების კატალოგი', 'სწავლა ონლაინ', 'პროფესიული კურსები'],
  openGraph: {
    title: 'კურსების კატალოგი | კურსები ონლაინ',
    description: 'იპოვე შენთვის საუკეთესო ონლაინ კურსი. პროფესიონალური კურსები საუკეთესო ინსტრუქტორებისგან.',
    url: `${BASE_URL}/courses`,
    siteName: 'კურსები ონლაინ',
    images: [
      {
        url: `${BASE_URL}/kursebi-logo.png`,
        width: 1200,
        height: 630,
        alt: 'კურსების კატალოგი',
      },
    ],
    type: 'website',
    locale: 'ka_GE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'კურსების კატალოგი | კურსები ონლაინ',
    description: 'იპოვე შენთვის საუკეთესო ონლაინ კურსი.',
    images: [`${BASE_URL}/kursebi-logo.png`],
  },
  alternates: {
    canonical: '/courses',
  },
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
