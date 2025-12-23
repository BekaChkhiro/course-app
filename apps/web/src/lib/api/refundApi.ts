import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const refundApi = axios.create({
  baseURL: `${API_URL}/api/refund`,
  withCredentials: true
});

// Request interceptor to add auth token
refundApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
refundApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          withCredentials: true
        });
        const accessToken = response.data.data.accessToken;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return refundApi(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// TYPES
// ============================================

export type RefundStatus = 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED';

export interface RefundRequest {
  id: string;
  status: RefundStatus;
  reason: string;
  requestedAmount: number;
  refundedAmount: number | null;
  rejectionReason: string | null;
  adminNotes?: string | null;
  course: {
    id: string;
    title: string;
    thumbnail?: string | null;
    slug?: string;
  };
  user?: {
    id: string;
    name: string;
    surname: string;
    email: string;
  };
  purchaseId?: string;
  bogOrderId?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  completedAt: string | null;
}

export interface RefundStats {
  pending: number;
  processing: number;
  completed: number;
  rejected: number;
  failed: number;
  totalRefundedAmount: number;
}

// ============================================
// STUDENT APIs
// ============================================

/**
 * სტუდენტის refund მოთხოვნის შექმნა
 */
export const createRefundRequest = async (purchaseId: string, reason: string) => {
  try {
    const response = await refundApi.post('/request', { purchaseId, reason });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'შეცდომა მოთხოვნის გაგზავნისას' };
  }
};

/**
 * სტუდენტის საკუთარი refund მოთხოვნების სია
 */
export const getMyRefundRequests = async (): Promise<RefundRequest[]> => {
  try {
    const response = await refundApi.get('/my-requests');
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'შეცდომა მოთხოვნების მიღებისას' };
  }
};

// ============================================
// ADMIN APIs
// ============================================

/**
 * ადმინის - ყველა refund მოთხოვნის სია
 */
export const getAllRefundRequests = async (params?: {
  status?: RefundStatus | 'all';
  page?: number;
  limit?: number;
}): Promise<{
  items: RefundRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  try {
    const response = await refundApi.get('/admin/list', { params });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'შეცდომა მოთხოვნების მიღებისას' };
  }
};

/**
 * ადმინის - refund სტატისტიკა
 */
export const getRefundStats = async (): Promise<RefundStats> => {
  try {
    const response = await refundApi.get('/admin/stats');
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'შეცდომა სტატისტიკის მიღებისას' };
  }
};

/**
 * ადმინის - refund მოთხოვნის დადასტურება
 */
export const approveRefundRequest = async (id: string, adminNotes?: string) => {
  try {
    const response = await refundApi.post(`/admin/${id}/approve`, { adminNotes });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'შეცდომა მოთხოვნის დადასტურებისას' };
  }
};

/**
 * ადმინის - refund მოთხოვნის უარყოფა
 */
export const rejectRefundRequest = async (id: string, rejectionReason: string, adminNotes?: string) => {
  try {
    const response = await refundApi.post(`/admin/${id}/reject`, { rejectionReason, adminNotes });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'შეცდომა მოთხოვნის უარყოფისას' };
  }
};

export default refundApi;
