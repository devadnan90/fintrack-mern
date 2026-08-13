import api from "../../services/api";
export const categoriesAPI = {
  list: (type) =>
    api
      .get("/categories", {
        params: type
          ? {
              type,
            }
          : {},
      })
      .then((r) => r.data),
  create: (payload) =>
    api.post("/categories", payload).then((r) => r.data.category),
  update: (id, payload) =>
    api.put(`/categories/${id}`, payload).then((r) => r.data.category),
  remove: (id, reassignTo) =>
    api
      .delete(`/categories/${id}`, {
        params: reassignTo
          ? {
              reassignTo,
            }
          : {},
      })
      .then((r) => r.data),
};
