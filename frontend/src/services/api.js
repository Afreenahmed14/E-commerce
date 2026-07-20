import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://e-commerce-zvmh.onrender.com/api/v1';

/**
 * Central Axios instance. `withCredentials` ensures the httpOnly refresh
 * token cookie is sent on every request. The access token is attached
 * per-request from memory/localStorage via the request interceptor below.
 */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('hr_access_token', token);
  } else {
    localStorage.removeItem('hr_access_token');
  }
};
export const getAccessToken = () => accessToken || localStorage.getItem('hr_access_token');

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, attempt a single silent refresh using the refresh-token cookie,
// then retry the original request once. Avoids infinite retry loops.
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        // Some pages (e.g. viewing a candidate profile while logged out)
        // want to show an in-place "please log in" prompt instead of being
        // yanked to /login — those requests set suppressAuthRedirect.
        if (!originalRequest.suppressAuthRedirect) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
