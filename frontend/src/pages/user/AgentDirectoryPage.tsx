import { useEffect, useMemo, useState } from "react";
import { ApiClient } from "../../api/client";
import { createListingsApi } from "../../api/listings";
import { env } from "../../config/env";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";

interface AgentSummary {
  id: string;
  email: string;
  createdAt: string;
}

export const AgentDirectoryPage = (): JSX.Element => {
  const publicClient = useMemo(() => new ApiClient({ baseUrl: env.apiBaseUrl }), []);
  const listingsApi = useMemo(() => createListingsApi(publicClient), [publicClient]);

  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listingsApi.getPublicAgents()
      .then((res) => setAgents(res.items))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [listingsApi]);

  const filtered = agents.filter((a) =>
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      {/* Header bar matching UserDiscoveryPage search bar style */}
      <div style={{ background: "var(--bg-secondary)", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "1rem 0" }}>
        <div className="container" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div className="form-group mb-0" style={{ flex: 1, maxWidth: "360px" }}>
            <input
              className="form-control"
              placeholder="Search agents by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-light)", fontWeight: 600 }}>
            {!loading && `${filtered.length} verified ${filtered.length === 1 ? "agent" : "agents"}`}
          </div>
        </div>
      </div>

      <main style={{ flex: 1, padding: "2.5rem 0", background: "var(--bg-primary)" }}>
        <div className="container">
          <h1 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Find an Agent</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
            Connect with our verified real estate agents.
          </p>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)" }}>
              <i className="bi bi-hourglass-split" style={{ fontSize: "2rem", display: "block", marginBottom: "1rem" }}></i>
              Loading agents...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)" }}>
              <i className="bi bi-people" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}></i>
              <h3 style={{ fontWeight: 700 }}>No agents found</h3>
              <p>{search ? "Try a different search." : "No verified agents are available yet."}</p>
            </div>
          ) : (
            <div className="grid-3">
              {filtered.map((agent) => (
                <div key={agent.id} className="card" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    <div style={{
                      width: "52px", height: "52px", borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 800, fontSize: "1.2rem",
                    }}>
                      {agent.email[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {agent.email}
                      </div>
                      <span className="badge badge-success" style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                        <i className="bi bi-patch-check-fill me-1"></i>Verified
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-light)", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "0.75rem" }}>
                    <i className="bi bi-calendar3 me-1" style={{ marginRight: "0.25rem" }}></i>
                    Member since {new Date(agent.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};