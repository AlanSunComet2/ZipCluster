import { useEffect, useMemo, useState } from "react";
import { createAdminApi } from "../../api/admin";
import { useApiClient } from "../../auth/useApiClient";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";

type User = { id: string; email: string; role: string; isActive: boolean };
type PendingListing = { id: string; location: string };
type PendingAgent = { id: string; email?: string };

export const AdminDashboardPage = (): JSX.Element => {
  const client = useApiClient();
  const adminApi = useMemo(() => createAdminApi(client), [client]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [activeSection, setActiveSection] = useState<"overview" | "listings" | "agents" | "users">("overview");

  const [stats, setStats] = useState<{
    totalUsers: number; totalAgents: number; totalListings: number;
    pendingListings: number; pendingAgentApplications: number; totalFavorites: number;
  } | null>(null);
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [pendingAgents, setPendingAgents] = useState<PendingAgent[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [analytics, listings, agents, usersRes] = await Promise.all([
        adminApi.getAnalyticsOverview(),
        adminApi.getPendingListings(),
        adminApi.getPendingAgents(),
        adminApi.listUsers(),
      ]);
      setStats(analytics);
      setPendingListings(listings.items);
      setPendingAgents(agents.items);
      setUsers(usersRes.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, [adminApi]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const approveListing = async (id: string) => {
    await adminApi.approveListing(id, "Approved by admin.");
    setPendingListings(prev => prev.filter(l => l.id !== id));
    flash("✓ Listing approved and now live.");
    void loadAll();
  };
  const rejectListing = async (id: string) => {
    await adminApi.rejectListing(id, "Needs revision.");
    setPendingListings(prev => prev.filter(l => l.id !== id));
    flash("✓ Listing rejected.");
    void loadAll();
  };
  const approveAgent = async (id: string) => {
    await adminApi.approveAgent(id);
    setPendingAgents(prev => prev.filter(a => a.id !== id));
    flash("✓ Agent application approved.");
    void loadAll();
  };
  const rejectAgent = async (id: string) => {
    await adminApi.rejectAgent(id, "License verification failed.");
    setPendingAgents(prev => prev.filter(a => a.id !== id));
    flash("✓ Agent application rejected.");
    void loadAll();
  };
  const toggleUser = async (id: string, isActive: boolean) => {
    if (isActive) await adminApi.deactivateUser(id);
    else await adminApi.reactivateUser(id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
    flash(`✓ User ${isActive ? "deactivated" : "reactivated"}.`);
  };

  const navItems: { key: typeof activeSection; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: "bi-speedometer2" },
    { key: "listings", label: "Pending Listings", icon: "bi-house-check", badge: pendingListings.length },
    { key: "agents", label: "Agent Applications", icon: "bi-person-badge", badge: pendingAgents.length },
    { key: "users", label: "Manage Users", icon: "bi-people" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>

        {/* Sidebar */}
        <nav style={{ width: "220px", background: "white", borderRight: "1px solid rgba(0,0,0,0.06)", padding: "2rem 1rem", flexShrink: 0 }}>
          <div style={{ marginBottom: "1.5rem", padding: "0 0.5rem" }}>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>Admin Portal</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>Platform management</div>
          </div>
          <ul className="nav flex-column" style={{ gap: "0.25rem", listStyle: "none", padding: 0 }}>
            {navItems.map(item => (
              <li key={item.key}>
                <button
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    width: "100%", textAlign: "left", padding: "0.75rem 1rem", border: "none", cursor: "pointer",
                    borderRadius: "var(--border-radius-sm)", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 600,
                    background: activeSection === item.key ? "var(--primary-color)" : "transparent",
                    color: activeSection === item.key ? "white" : "var(--text-secondary)",
                    display: "flex", alignItems: "center", gap: "0.75rem", transition: "all 0.15s",
                  }}
                >
                  <i className={`bi ${item.icon}`}></i>
                  {item.label}
                  {item.badge ? (
                    <span style={{ marginLeft: "auto", background: activeSection === item.key ? "rgba(255,255,255,0.3)" : "var(--primary-color)", color: "white", borderRadius: "20px", padding: "2px 8px", fontSize: "0.75rem" }}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "2.5rem", background: "var(--bg-primary)", overflowY: "auto" }}>
          {msg && (
            <div style={{ background: "var(--success)", color: "white", padding: "0.75rem 1.5rem", borderRadius: "var(--border-radius-sm)", marginBottom: "1.5rem", fontWeight: 600 }}>
              {msg}
            </div>
          )}

          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>System Overview</h1>
              {loading ? <p>Loading...</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                  {[
                    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: "bi-people", color: "var(--primary-color)" },
                    { label: "Active Agents", value: stats?.totalAgents ?? 0, icon: "bi-person-badge", color: "var(--success)" },
                    { label: "Total Listings", value: stats?.totalListings ?? 0, icon: "bi-house", color: "var(--secondary-color)" },
                    { label: "Pending Listings", value: stats?.pendingListings ?? 0, icon: "bi-clock", color: "var(--warning)" },
                    { label: "Pending Agents", value: stats?.pendingAgentApplications ?? 0, icon: "bi-person-exclamation", color: "var(--danger,#ef4444)" },
                    { label: "Total Saved", value: stats?.totalFavorites ?? 0, icon: "bi-heart", color: "#ec4899" },
                  ].map(stat => (
                    <div key={stat.label} className="card" style={{ padding: "1.5rem", borderLeft: `4px solid ${stat.color}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-light)", marginBottom: "0.5rem" }}>{stat.label}</div>
                          <div style={{ fontSize: "2rem", fontWeight: 800 }}>{stat.value}</div>
                        </div>
                        <i className={`bi ${stat.icon}`} style={{ fontSize: "1.5rem", color: stat.color, opacity: 0.7 }}></i>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* PENDING LISTINGS */}
          {activeSection === "listings" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Pending Listing Approvals</h1>
              <div className="card" style={{ padding: "0.5rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.05)" }}>
                      <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase" }}>Property</th>
                      <th style={{ padding: "1rem", textAlign: "right", color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingListings.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>No listings pending approval.</td></tr>
                    ) : pendingListings.map(listing => (
                      <tr key={listing.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ fontWeight: 600 }}>{listing.location}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>ID: {listing.id}</div>
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <button onClick={() => approveListing(listing.id)} className="btn btn-primary" style={{ marginRight: "0.5rem", padding: "0.35rem 1rem", fontSize: "0.85rem" }}>Approve</button>
                          <button onClick={() => rejectListing(listing.id)} className="btn btn-outline" style={{ padding: "0.35rem 1rem", fontSize: "0.85rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* AGENT APPLICATIONS */}
          {activeSection === "agents" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Agent Applications</h1>
              <div className="card" style={{ padding: "0.5rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.05)" }}>
                      <th style={{ padding: "1rem", textAlign: "left", color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase" }}>Applicant</th>
                      <th style={{ padding: "1rem", textAlign: "right", color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAgents.length === 0 ? (
                      <tr><td colSpan={2} style={{ padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>No pending applications.</td></tr>
                    ) : pendingAgents.map(agent => (
                      <tr key={agent.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <img src={`https://ui-avatars.com/api/?name=${agent.email || "Agent"}&background=random&color=fff&size=40`} style={{ width: "40px", height: "40px", borderRadius: "50%" }} alt="" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{agent.email || "Unknown"}</div>
                              <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>Pending Review</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <button onClick={() => approveAgent(agent.id)} className="btn btn-primary" style={{ marginRight: "0.5rem", padding: "0.35rem 1rem", fontSize: "0.85rem" }}>Approve</button>
                          <button onClick={() => rejectAgent(agent.id)} className="btn btn-outline" style={{ padding: "0.35rem 1rem", fontSize: "0.85rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* MANAGE USERS */}
          {activeSection === "users" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Manage Users</h1>
              <div className="card" style={{ padding: "0.5rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.05)" }}>
                      {["User", "Role", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "1rem", textAlign: h === "Actions" ? "right" : "left", color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>No users found.</td></tr>
                    ) : users.map(user => (
                      <tr key={user.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <img src={`https://ui-avatars.com/api/?name=${user.email}&background=random&color=fff&size=40`} style={{ width: "40px", height: "40px", borderRadius: "50%" }} alt="" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{user.email}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>ID: {user.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <span className={`badge ${user.role === "ADMIN" ? "badge-primary" : user.role === "AGENT" ? "badge-warning" : "badge-success"}`}>{user.role}</span>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <span className={`badge ${user.isActive ? "badge-success" : "badge-danger"}`}>{user.isActive ? "Active" : "Suspended"}</span>
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <button onClick={() => toggleUser(user.id, user.isActive)} className="btn btn-outline"
                            style={{ padding: "0.3rem 0.8rem", fontSize: "0.85rem", color: user.isActive ? "var(--danger,#ef4444)" : "var(--success)", borderColor: user.isActive ? "var(--danger,#ef4444)" : "var(--success)" }}>
                            {user.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};
