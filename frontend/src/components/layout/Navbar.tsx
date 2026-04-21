import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

export const Navbar = (): JSX.Element => {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header>
      <nav className="container navbar">
        <Link to="/" className="navbar-brand">
          <i className="bi bi-building"></i> RealEstate.co
        </Link>
        <ul className="navbar-nav">
          <li><Link to="/" className="nav-link">Buy</Link></li>
          <li><Link to="/agent/public-profile" className="nav-link">Find an Agent</Link></li>
          {session && (
            <>
            <li><Link to="/saved" className="nav-link">Saved Properties</Link></li>
            </>
          )}
        </ul>
        <div className="navbar-actions">
          {!session ? (
            <>
              <Link to="/login" className="btn btn-outline">Log In</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </>
          ) : (
            <>
              {session.role === "ADMIN" && <Link to="/admin" className="btn btn-outline">Admin Panel</Link>}
              {session.role === "AGENT" && <Link to="/agent" className="btn btn-outline">Agent Dashboard</Link>}
              <button type="button" onClick={handleLogout} className="btn btn-primary">Logout</button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
