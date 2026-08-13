import { Navigate, Outlet } from "react-router-dom";
import { getAdminToken } from "../services/adminApi";
export default function AdminProtectedRoute() {
  const token = getAdminToken();
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
