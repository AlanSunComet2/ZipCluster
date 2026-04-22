import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAuthApi } from "../../api/auth";
import { useApiClient } from "../../auth/useApiClient";
import { useAuth } from "../../auth/AuthProvider";

interface Props {
  title?: string;
  description?: string;
  compact?: boolean;
}

const MIN_PASSWORD_LENGTH = 8;

export const ChangePasswordForm = ({
  title = "Change Password",
  description = "For your security, changing your password will sign you out of all active sessions.",
  compact = false,
}: Props): JSX.Element => {
  const client = useApiClient();
  const authApi = useMemo(() => createAuthApi(client), [client]);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    currentPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    !busy;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg("New password must be different from the current password.");
      return;
    }

    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setSuccessMsg("Password updated. Signing you out…");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        logout();
        navigate("/login", { replace: true });
      }, 1500);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to update password.";
      setErrorMsg(message || "Unable to update password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: compact ? "1.25rem" : "1.75rem",
        maxWidth: "480px",
      }}
    >
      <h3 style={{ fontWeight: 700, margin: 0, marginBottom: "0.35rem" }}>{title}</h3>
      <p
        style={{
          color: "var(--text-light)",
          fontSize: "0.85rem",
          marginBottom: "1rem",
        }}
      >
        {description}
      </p>

      {successMsg && (
        <div
          style={{
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #10b981",
            padding: "0.6rem 0.85rem",
            borderRadius: "var(--border-radius-sm)",
            marginBottom: "0.75rem",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "0.6rem 0.85rem",
            borderRadius: "var(--border-radius-sm)",
            marginBottom: "0.75rem",
            fontSize: "0.85rem",
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="form-control"
            style={{ marginTop: "0.25rem" }}
          />
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="form-control"
            style={{ marginTop: "0.25rem" }}
          />
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="form-control"
            style={{ marginTop: "0.25rem" }}
          />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
};
