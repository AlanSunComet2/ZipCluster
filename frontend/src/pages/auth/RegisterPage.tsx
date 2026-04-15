import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RegisterInput } from "../../api/contracts";
import { useAuth } from "../../auth/AuthProvider";

export const RegisterPage = (): JSX.Element => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterInput>({
    email: "",
    password: "",
    role: "USER",
  });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      await register(form);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    }
  };

  return (
    <main>
      <h1>Register</h1>
      <form onSubmit={submit}>
        <input
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="Email"
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Password"
        />
        <select
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as RegisterInput["role"] }))}
        >
          <option value="USER">User</option>
          <option value="AGENT">Agent</option>
        </select>
        <button type="submit">Create account</button>
      </form>
      {error ? <p>{error}</p> : null}
      <p>
        Already registered? <Link to="/login">Login</Link>
      </p>
    </main>
  );
};
