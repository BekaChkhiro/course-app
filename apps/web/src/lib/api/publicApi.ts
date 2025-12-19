const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Public API for unauthenticated requests
export const publicApi = {
  // Get published courses with filters
  async getCourses(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: 'popular' | 'newest' | 'price_low' | 'price_high' | 'rating';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sort) searchParams.set('sort', params.sort);

    const response = await fetch(`${API_URL}/api/public/courses?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch courses');
    }
    return data.data;
  },

  // Get popular courses for homepage
  async getPopularCourses(limit: number = 6) {
    const response = await fetch(`${API_URL}/api/public/courses?sort=popular&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch popular courses');
    }
    return data.data?.courses || [];
  },

  // Get single course by slug
  async getCourse(slug: string) {
    // Include auth token if available to get isEnrolled status
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/public/courses/${slug}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Course not found');
    }
    return data.data;
  },

  // Get all categories
  async getCategories() {
    const response = await fetch(`${API_URL}/api/public/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch categories');
    }
    return data.data || [];
  },

  // Get course reviews
  async getCourseReviews(courseId: string, page: number = 1, limit: number = 10) {
    const response = await fetch(
      `${API_URL}/api/public/courses/${courseId}/reviews?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch reviews');
    }
    return data.data;
  },

  // Submit contact form
  async submitContactForm(formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const response = await fetch(`${API_URL}/api/public/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to submit contact form');
    }
    return data;
  },

  // Submit course for review (become an instructor)
  async submitCourse(formData: FormData) {
    const response = await fetch(`${API_URL}/api/public/course-submissions`, {
      method: 'POST',
      body: formData, // FormData for file uploads - no Content-Type header needed
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to submit course');
    }
    return data;
  },

  // Get FAQs (public - only active ones)
  async getFAQs(category?: string) {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await fetch(`${API_URL}/api/faqs/public${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data.faqs || [];
  },

  // Get sliders (public - only active ones)
  async getSliders() {
    const response = await fetch(`${API_URL}/api/sliders/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data.sliders || [];
  },

  // Submit course booking request
  async submitCourseBooking(formData: {
    courseId: string;
    courseTitle: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    preferredDays: string[];
    preferredTimeFrom: string;
    preferredTimeTo: string;
    comment: string;
  }) {
    const response = await fetch(`${API_URL}/api/public/course-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to submit booking');
    }
    return data;
  },

  // Get all active instructors
  async getInstructors() {
    const response = await fetch(`${API_URL}/api/instructors/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch instructors');
    }
    return data.data || [];
  },

  // Get single instructor by slug
  async getInstructor(slug: string) {
    const response = await fetch(`${API_URL}/api/instructors/public/${slug}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Instructor not found');
    }
    return data.data;
  },
};
