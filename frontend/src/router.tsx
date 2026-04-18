import { Navigate, createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AgentDashboardPage } from "./pages/agent/AgentDashboardPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { UserDiscoveryPage } from "./pages/user/UserDiscoveryPage";
import { PropertyDetailsPage } from "./pages/user/PropertyDetailsPage";
import { SavedPropertiesPage } from "./pages/user/SavedPropertiesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <UserDiscoveryPage />,
  },
  {
    path: "/property/:id",
    element: <PropertyDetailsPage />,
  },
  {
    path: "/saved",
    element: (
      <ProtectedRoute allowedRoles={["USER", "AGENT", "ADMIN"]}>
        <SavedPropertiesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <AdminDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/agent",
    element: (
      <ProtectedRoute allowedRoles={["AGENT"]}>
        <AgentDashboardPage />
      </ProtectedRoute>
    ),
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
