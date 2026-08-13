import axios from "axios";
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const api = axios.create({
  baseURL,
  withCredentials: true,
});
let accessToken = null;
let onUnauthorized = () => {};
export function setAccessToken(token) {
  accessToken = token;
}
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
let refreshPromise = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isRefreshCall = config?.url?.includes("/auth/refresh");
    const wasAuthenticatedRequest = Boolean(config?.headers?.Authorization);
    if (
      response?.status === 401 &&
      config &&
      !config._retry &&
      !isRefreshCall &&
      wasAuthenticatedRequest
    ) {
      config._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh")
            .then((res) => {
              accessToken = res.data.accessToken;
              return accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch (refreshError) {
        accessToken = null;
        onUnauthorized();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
export default api;
