import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Axios instance for payment API
const paymentApi = axios.create({
  baseURL: `${API_URL}/api/purchase`,
  withCredentials: true,
})

// Request interceptor - ამატებს auth token-ს ყველა მოთხოვნას
paymentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - token refresh 401-ზე
paymentApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const accessToken = response.data.data.accessToken
        localStorage.setItem('accessToken', accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return paymentApi(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// ==========================================
// Types (ტიპები)
// ==========================================

/** გადახდის დაწყების პასუხი */
export interface InitiatePaymentResponse {
  success: boolean
  data?: {
    orderId: string
    redirectUrl: string
    amount: number
    originalAmount: number
    discount: number
  }
  message?: string
}

/** გადახდის სტატუსის პასუხი */
export interface PaymentStatusResponse {
  success: boolean
  data?: {
    orderId: string
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
    amount: number
    course: {
      id: string
      title: string
      slug: string
    }
    paidAt: string | null
  }
  message?: string
}

/** ჩარიცხვის შემოწმების პასუხი */
export interface EnrollmentCheckResponse {
  success: boolean
  data?: {
    isEnrolled: boolean
    purchaseStatus: string | null
    enrolledAt: string | null
  }
  message?: string
}

// ==========================================
// API Functions (API ფუნქციები)
// ==========================================

/**
 * გადახდის პროცესის დაწყება
 */
export const initiatePayment = async (
  courseId: string,
  promoCode?: string
): Promise<InitiatePaymentResponse> => {
  const response = await paymentApi.post('/initiate', {
    courseId,
    promoCode,
  })
  return response.data
}

/**
 * გადახდის სტატუსის შემოწმება
 */
export const checkPaymentStatus = async (orderId: string): Promise<PaymentStatusResponse> => {
  const response = await paymentApi.get(`/status/${orderId}`)
  return response.data
}

/**
 * უფასო კურსზე ჩარიცხვა
 */
export const enrollInCourse = async (courseId: string) => {
  const response = await paymentApi.post('/enroll', { courseId })
  return response.data
}

/**
 * ჩარიცხვის სტატუსის შემოწმება
 */
export const checkEnrollment = async (courseId: string): Promise<EnrollmentCheckResponse> => {
  const response = await paymentApi.get(`/check/${courseId}`)
  return response.data
}

export default paymentApi
