import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || '/api';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url === '/auth/refresh' ||
      originalRequest.url === '/auth/logout'
    ) {
      throw error;
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = api
        .post('/auth/refresh')
        .then(() => {})
        .finally(() => {
          refreshPromise = null;
        });
    }

    await refreshPromise;
    return api(originalRequest);
  },
);

export default api;
