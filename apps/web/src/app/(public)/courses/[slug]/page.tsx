import { Metadata } from 'next';
import CoursePageClient from './CoursePageClient';

// Server-side API URL (can be internal URL for better performance)
const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kursebi.online';

interface CourseData {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  thumbnail?: string;
  price: number;
  category?: {
    name: string;
    slug: string;
  };
  instructor?: {
    firstName: string;
    lastName: string;
  };
  averageRating?: number;
  studentCount?: number;
}

async function getCourse(slug: string): Promise<CourseData | null> {
  const url = `${API_URL}/api/public/courses/${slug}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch course: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error(`Error fetching course metadata from ${url}:`, error);
    return null;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    return {
      title: 'კურსი ვერ მოიძებნა',
      description: 'სამწუხაროდ, ეს კურსი არ არსებობს ან წაშლილია',
    };
  }

  const description = course.shortDescription
    ? stripHtml(course.shortDescription).slice(0, 160)
    : course.description
    ? stripHtml(course.description).slice(0, 160)
    : 'ონლაინ კურსი კურსები ონლაინ პლატფორმაზე';

  const instructorName = course.instructor
    ? `${course.instructor.firstName} ${course.instructor.lastName}`
    : undefined;

  return {
    title: course.title,
    description,
    keywords: [
      course.title,
      course.category?.name,
      instructorName,
      'ონლაინ კურსი',
      'სწავლა',
    ].filter(Boolean) as string[],
    authors: instructorName ? [{ name: instructorName }] : undefined,
    openGraph: {
      title: course.title,
      description,
      url: `${BASE_URL}/courses/${course.slug}`,
      siteName: 'კურსები ონლაინ',
      images: course.thumbnail
        ? [
            {
              url: course.thumbnail,
              width: 1200,
              height: 630,
              alt: course.title,
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
      type: 'website',
      locale: 'ka_GE',
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title,
      description,
      images: course.thumbnail ? [course.thumbnail] : [`${BASE_URL}/kursebi-logo.png`],
    },
    alternates: {
      canonical: `/courses/${course.slug}`,
    },
    other: {
      'product:price:amount': course.price.toString(),
      'product:price:currency': 'GEL',
    },
  };
}

export default function CoursePage() {
  return <CoursePageClient />;
}
