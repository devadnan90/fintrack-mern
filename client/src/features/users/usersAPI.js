import api from "../../services/api";
export const usersAPI = {
  updateProfile: (payload) => api.put("/users/me", payload).then((r) => r.data),
  changePassword: (payload) =>
    api.put("/users/me/password", payload).then((r) => r.data),
  deleteAccount: (password) =>
    api
      .delete("/users/me", {
        data: {
          password,
        },
      })
      .then((r) => r.data),
  exportData: () =>
    api
      .get("/users/me/export", {
        responseType: "blob",
      })
      .then((r) => r.data),
  startTwoFactorSetup: () =>
    api.post("/users/me/2fa/setup").then((r) => r.data),
  confirmTwoFactorSetup: (token) =>
    api
      .post("/users/me/2fa/confirm", {
        token,
      })
      .then((r) => r.data),
  disableTwoFactor: (payload) =>
    api.post("/users/me/2fa/disable", payload).then((r) => r.data),
  regenerateBackupCodes: (token) =>
    api
      .post("/users/me/2fa/backup-codes", {
        token,
      })
      .then((r) => r.data),
  listPasskeys: () =>
    api.get("/users/me/passkeys").then((r) => r.data.passkeys),
  startPasskeyRegistration: () =>
    api.post("/users/me/passkeys/register-options").then((r) => r.data),
  finishPasskeyRegistration: (response, name) =>
    api
      .post("/users/me/passkeys/register-verify", {
        response,
        name,
      })
      .then((r) => r.data.passkey),
  deletePasskey: (id) =>
    api.delete(`/users/me/passkeys/${id}`).then((r) => r.data),
};
