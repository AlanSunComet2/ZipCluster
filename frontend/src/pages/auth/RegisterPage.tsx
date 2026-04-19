import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";

export const RegisterPage = (): JSX.Element => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "AGENT">("USER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, role });
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mb-5 mt-4" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <div className="card shadow-lg" style={{ border: 'none', borderRadius: '1rem', padding: '2rem' }}>
            <div className="text-center mb-4">
              <h2 style={{ fontWeight: 800 }}>Create an Account</h2>
              <p className="text-muted">Join RealEstate.co today</p>
            </div>
            
            <div className="d-flex justify-content-center mb-4" style={{ gap: '1rem', borderBottom: '2px solid rgba(0,0,0,0.05)', paddingBottom: '1rem' }}>
              <Link to="/login" className="btn btn-outline" style={{ padding: '0.4rem 2rem', borderRadius: '5px', border: 'none', color: 'var(--text-light)' }}>Log In</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.4rem 2rem', borderRadius: '5px' }}>Register</Link>
            </div>

            {error && <div className="badge badge-danger mb-4 w-100" style={{ padding: '1rem', borderRadius: '8px', textAlign: 'left', whiteSpace: 'normal' }}>An account already exists with this email</div>}

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
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  required 
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                  Must be at least 8 characters.
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Account Type</label>
                <select 
                  className="form-control" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value as "USER" | "AGENT")}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="USER">Buyer / Investor</option>
                  <option value="AGENT">Real Estate Agent</option>
                </select>
              </div>

              <div className="form-group mb-4 d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <input type="checkbox" required id="terms" style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary-color)' }} />
                <label htmlFor="terms" className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                  I agree to the <a href="#">Terms of Service</a>
                </label>
              </div>
              
              <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};
