import api from "../../services/api";
export const notificationsAPI = {
  list: () => api.get("/notifications").then((r) => r.data),
  markRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put("/notifications/read-all").then((r) => r.data),
  dismiss: (id) => api.delete(`/notifications/${id}`).then((r) => r.data),
};
