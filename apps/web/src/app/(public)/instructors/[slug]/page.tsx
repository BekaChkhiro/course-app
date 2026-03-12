import { Metadata } from 'next';
import InstructorPageClient from './InstructorPageClient';

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kursebi.online';

interface InstructorData {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  profession: string;
  bio: string | null;
  avatar: string | null;
  metaTitle?: string;
  metaDescription?: string;
  courses: Array<{
    id: string;
    title: string;
  }>;
}

async function getInstructor(slug: string): Promise<InstructorData | null> {
  const url = `${API_URL}/api/instructors/public/${slug}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch instructor: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error(`Error fetching instructor metadata from ${url}:`, error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const instructor = await getInstructor(slug);

  if (!instructor) {
    return {
      title: 'ლექტორი ვერ მოიძებნა',
      description: 'მოთხოვნილი ლექტორი არ არსებობს ან წაშლილია',
    };
  }

  const fullName = `${instructor.firstName} ${instructor.lastName}`;

  // Use custom meta title/description if provided, otherwise fallback to generated ones
  const metaTitle = instructor.metaTitle || fullName;
  const metaDescription = instructor.metaDescription || (
    instructor.bio
      ? instructor.bio.slice(0, 160)
      : `${fullName} - ${instructor.profession}. ${instructor.courses?.length || 0} კურსი კურსები ონლაინ პლატფორმაზე.`
  );

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: [
      fullName,
      instructor.profession,
      'ლექტორი',
      'ინსტრუქტორი',
      'ონლაინ კურსები',
    ],
    authors: [{ name: fullName }],
    openGraph: {
      title: `${fullName} - ${instructor.profession}`,
      description: metaDescription,
      url: `${BASE_URL}/instructors/${instructor.slug}`,
      siteName: 'კურსები ონლაინ',
      images: instructor.avatar
        ? [
            {
              url: instructor.avatar,
              width: 800,
              height: 800,
              alt: fullName,
            },
          ]
        : [
            {
              url: `${BASE_URL}/kursebi-logo.png`,
              width: 1200,
              height: 630,
              alt: 'კურსები ონლაინ',
            },
          ],
      type: 'profile',
      locale: 'ka_GE',
    },
    twitter: {
      card: 'summary',
      title: `${fullName} - ${instructor.profession}`,
      description: metaDescription,
      images: instructor.avatar ? [instructor.avatar] : [`${BASE_URL}/kursebi-logo.png`],
    },
    alternates: {
      canonical: `/instructors/${instructor.slug}`,
    },
  };
}

export default function InstructorPage() {
  return <InstructorPageClient />;
}
