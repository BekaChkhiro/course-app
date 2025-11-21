import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Log environment configuration
console.log('🌍 Auth API Environment Configuration:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('API_URL (used):', API_URL);
console.log('---');

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Request interceptor to add auth token with detailed logging
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');

    console.group('🔐 Auth API Request');
    console.log('URL:', config.baseURL + config.url);
    console.log('Method:', config.method?.toUpperCase());
    console.log('Token exists:', !!token);
    if (token) {
      console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ No accessToken in localStorage');
    }
    console.log('Headers:', config.headers);
    console.groupEnd();

    return config;
  },
  (error) => {
    console.error('❌ Auth API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh with detailed logging
apiClient.interceptors.response.use(
  (response) => {
    console.group('✅ Auth API Response Success');
    console.log('URL:', response.config.url);
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    console.groupEnd();
    return response;
  },
  async (error) => {
    console.group('❌ Auth API Response Error');
    console.log('URL:', error.config?.url);
    console.log('Status:', error.response?.status);
    console.log('Error Message:', error.response?.data?.message || error.message);
    console.log('Full Error:', error.response?.data);
    console.groupEnd();

    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log('🔄 Attempting token refresh...');

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;

        // Save new token
        localStorage.setItem('accessToken', accessToken);
        console.log('✅ Token refreshed successfully');

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error('❌ Token refresh failed, redirecting to login');
        localStorage.removeItem('accessToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Device fingerprinting utility
export const getDeviceFingerprint = () => {
  return {
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: window.screen.colorDepth.toString(),
  };
};

// Auth API types
export interface RegisterData {
  name: string;
  surname: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  avatar?: string;
  bio?: string;
}

export interface Device {
  id: string;
  deviceName: string;
  deviceType: string;
  browser?: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
}

// Auth API endpoints
export const authApi = {
  // Register new user
  register: async (data: RegisterData) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  // Login user
  login: async (data: LoginData) => {
    const fingerprint = getDeviceFingerprint();
    const response = await apiClient.post('/auth/login', {
      ...data,
      ...fingerprint,
    });

    // Save access token
    if (response.data.success && response.data.data.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
    }

    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    localStorage.removeItem('accessToken');
    return response.data;
  },

  // Refresh access token
  refreshToken: async () => {
    const response = await axios.post(
      `${API_URL}/api/auth/refresh`,
      {},
      { withCredentials: true }
    );

    if (response.data.success && response.data.data.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
    }

    return response.data;
  },

  // Verify email
  verifyEmail: async (token: string) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  // Request password reset
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (token: string, password: string, confirmPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      password,
      confirmPassword,
    });
    return response.data;
  },

  // Get current user profile
  getProfile: async (): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Get user's devices
  getDevices: async (): Promise<{ success: boolean; data: { devices: Device[] } }> => {
    const response = await apiClient.get('/auth/devices');
    return response.data;
  },

  // Update device name
  updateDeviceName: async (deviceId: string, deviceName: string) => {
    const response = await apiClient.patch(`/auth/devices/${deviceId}`, {
      deviceName,
    });
    return response.data;
  },

  // Remove device
  removeDevice: async (deviceId: string) => {
    const response = await apiClient.delete(`/auth/devices/${deviceId}`);
    return response.data;
  },
};

export default apiClient;
