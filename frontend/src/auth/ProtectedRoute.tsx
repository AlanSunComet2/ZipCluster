import { Navigate } from "react-router-dom";
import type { UserRole } from "../api/contracts";
import { useAuth } from "./AuthProvider";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: JSX.Element;
}

export const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps): JSX.Element => {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};
