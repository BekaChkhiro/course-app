import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User, LoginData, RegisterData } from '@/lib/api/authApi';

// Translate error messages to Georgian
const translateError = (message: string): string => {
  const translations: Record<string, string> = {
    'User with this email already exists': 'ამ ელ-ფოსტით მომხმარებელი უკვე არსებობს',
    'User with this phone number already exists': 'ამ ტელეფონის ნომრით მომხმარებელი უკვე არსებობს',
    'Invalid email or password': 'არასწორი ელ-ფოსტა ან პაროლი',
    'Invalid refresh token': 'სესია ამოიწურა, გთხოვთ თავიდან შეხვიდეთ',
    'Invalid or expired verification token': 'არასწორი ან ვადაგასული დადასტურების ბმული',
    'Invalid or expired reset token': 'არასწორი ან ვადაგასული აღდგენის ბმული',
    'Login failed': 'შესვლა ვერ მოხერხდა',
    'Registration failed': 'რეგისტრაცია ვერ მოხერხდა',
    'Email not verified': 'ელ-ფოსტა არ არის დადასტურებული',
    'Account is disabled': 'ანგარიში გაუქმებულია',
    'Too many login attempts': 'ძალიან ბევრი მცდელობა, სცადეთ მოგვიანებით',
    'Network Error': 'ქსელის შეცდომა, შეამოწმეთ ინტერნეტ კავშირი',
  };

  // Check for exact match first
  if (translations[message]) {
    return translations[message];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(translations)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return message;
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean; // ტოკენის ვალიდაცია დასრულებულია?

  // Actions
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  initializeAuth: () => Promise<void>; // აპის სტარტზე ვალიდაცია
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isInitialized: false,

      login: async (data: LoginData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(data);

          if (response.success) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error: any) {
          const rawMessage =
            error.response?.data?.message || error.message || 'Login failed';
          const errorMessage = translateError(rawMessage);
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);

          if (response.success) {
            set({
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error: any) {
          const rawMessage =
            error.response?.data?.message ||
            error.message ||
            'Registration failed';
          const errorMessage = translateError(rawMessage);
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      fetchProfile: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await authApi.getProfile();

          if (response.success) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error: any) {
          console.error('Fetch profile error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      initializeAuth: async () => {
        // თუ უკვე ინიციალიზებულია, არ გავიმეოროთ
        if (get().isInitialized) return;

        const token = localStorage.getItem('accessToken');

        // თუ ტოკენი არ არის, მაშინვე დავასრულოთ
        if (!token) {
          set({
            isAuthenticated: false,
            user: null,
            isInitialized: true,
            isLoading: false
          });
          return;
        }

        // ტოკენი არის - შევამოწმოთ სერვერთან
        set({ isLoading: true });
        try {
          const response = await authApi.getProfile();

          if (response.success) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            // ტოკენი არავალიდურია
            localStorage.removeItem('accessToken');
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
        } catch (error: any) {
          console.error('Auth initialization error:', error);
          // შეცდომის შემთხვევაში გავასუფთავოთ
          localStorage.removeItem('accessToken');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user: User | null) =>
        set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
