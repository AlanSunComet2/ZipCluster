import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { ChangePasswordForm } from "../../components/account/ChangePasswordForm";
import { useAuth } from "../../auth/AuthProvider";

export const AccountSettingsPage = (): JSX.Element => {
  const { session } = useAuth();
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main
        style={{
          flex: 1,
          padding: "2.5rem 1.5rem",
          background: "var(--bg-primary)",
        }}
      >
        <div className="container" style={{ maxWidth: "720px" }}>
          <h1 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Account Settings</h1>
          <p style={{ color: "var(--text-light)", marginBottom: "2rem" }}>
            Signed in as <strong>{session?.email}</strong>
            {session ? ` (${session.role.toLowerCase()})` : ""}.
          </p>
          <ChangePasswordForm />
        </div>
      </main>
      <Footer />
    </div>
  );
};
