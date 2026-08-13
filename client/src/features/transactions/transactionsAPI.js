import api from "../../services/api";
export const transactionsAPI = {
  list: (params) =>
    api
      .get("/transactions", {
        params,
      })
      .then((r) => r.data),
  create: (payload) =>
    api.post("/transactions", payload).then((r) => r.data.transaction),
  update: (id, payload) =>
    api.put(`/transactions/${id}`, payload).then((r) => r.data.transaction),
  remove: (id) => api.delete(`/transactions/${id}`).then((r) => r.data),
  bulkDelete: (ids) =>
    api
      .post("/transactions/bulk-delete", {
        ids,
      })
      .then((r) => r.data),
  bulkUpdate: (payload) =>
    api.post("/transactions/bulk-update", payload).then((r) => r.data),
  restore: (id) =>
    api.post(`/transactions/${id}/restore`).then((r) => r.data.transaction),
  bulkRestore: (ids) =>
    api
      .post("/transactions/bulk-restore", {
        ids,
      })
      .then((r) => r.data),
  trash: () => api.get("/transactions/trash").then((r) => r.data),
  permanentlyDelete: (id) =>
    api.delete(`/transactions/${id}/permanent`).then((r) => r.data),
  importCsv: (file, mapping) => {
    const formData = new FormData();
    formData.append("file", file);
    if (mapping) formData.append("mapping", JSON.stringify(mapping));
    return api
      .post("/transactions/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((r) => r.data);
  },
  previewImportCsv: (file, mapping) => {
    const formData = new FormData();
    formData.append("file", file);
    if (mapping) formData.append("mapping", JSON.stringify(mapping));
    return api
      .post("/transactions/import/preview", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((r) => r.data);
  },
};
