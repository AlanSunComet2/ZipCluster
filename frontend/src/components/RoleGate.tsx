import type { PropsWithChildren } from "react";
import type { UserRole } from "../api/contracts";

interface RoleGateProps extends PropsWithChildren {
  currentRole: UserRole | null;
  allowedRoles: UserRole[];
}

export const RoleGate = ({ currentRole, allowedRoles, children }: RoleGateProps): JSX.Element => {
  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <div>Access denied.</div>;
  }

  return <>{children}</>;
};
