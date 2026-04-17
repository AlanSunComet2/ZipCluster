import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";

export const LoginPage = (): JSX.Element => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mb-5 mt-4" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          <div className="card shadow-lg" style={{ border: 'none', borderRadius: '1rem', padding: '2rem' }}>
            <div className="text-center mb-4">
              <h2 style={{ fontWeight: 800 }}>Welcome Back</h2>
              <p className="text-muted">Enter your credentials to access your account</p>
            </div>
            
            <div className="d-flex justify-content-center mb-4" style={{ gap: '1rem', borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '1rem' }}>
              <Link to="/login" className="btn btn-primary" style={{ padding: '0.4rem 2rem', borderRadius: '5px' }}>Log In</Link>
              <Link to="/register" className="btn btn-outline" style={{ padding: '0.4rem 2rem', borderRadius: '5px', border: 'none', color: 'var(--text-light)' }}>Register</Link>
            </div>

            {error && <div className="badge badge-danger mb-4 w-100" style={{ padding: '1rem', borderRadius: '8px', textAlign: 'left', whiteSpace: 'normal' }}>{error}</div>}

            <form onSubmit={submit}>
              <div className="form-group mb-3">
                <label className="form-label">Email address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="form-group mb-4">
                <div className="d-flex justify-content-between">
                  <label className="form-label">Password</label>
                  <a href="#" style={{ fontSize: '0.85rem' }}>Forgot password?</a>
                </div>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </button>

              <div className="text-center mt-4">
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};
