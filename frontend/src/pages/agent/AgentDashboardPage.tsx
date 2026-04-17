import { useEffect, useMemo, useState } from "react";
import { createAgentApi } from "../../api/agent";
import { useApiClient } from "../../auth/useApiClient";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import type { ListingSummary } from "../../api/contracts";
import { Link } from "react-router-dom";

type Section = "overview" | "listings" | "create" | "inquiries" | "profile";

export const AgentDashboardPage = (): JSX.Element => {
  const client = useApiClient();
  const agentApi = useMemo(() => createAgentApi(client), [client]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [inquiries, setInquiries] = useState<Array<{ id: string; message: string }>>([]);
  const [tourRequests, setTourRequests] = useState<Array<{ id: string; status: string; preferredTime: string }>>([]);
  const [verification, setVerification] = useState<{ status: string; applicationStatus: string } | null>(null);

  // Profile form
  const [docUrl, setDocUrl] = useState("");

  // Create listing form
  const [newListing, setNewListing] = useState({ price: "", location: "", propertyType: "House", description: "", mediaUrls: "" });

  const [inquiryResponses, setInquiryResponses] = useState<Record<string, string>>({});

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [listingsRes, inquiriesRes, toursRes, verRes] = await Promise.all([
        agentApi.listMyListings(),
        agentApi.listInquiries(),
        agentApi.listTourRequests(),
        agentApi.getVerificationStatus(),
      ]);
      setListings(listingsRes.items);
      setInquiries(inquiriesRes.items);
      setTourRequests(toursRes.items);
      setVerification(verRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, [agentApi]);

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await agentApi.createListing({
        price: Number(newListing.price),
        location: newListing.location,
        propertyType: newListing.propertyType,
        description: newListing.description,
        mediaUrls: newListing.mediaUrls.split(",").map(u => u.trim()).filter(Boolean),
      });
      setNewListing({ price: "", location: "", propertyType: "House", description: "", mediaUrls: "" });
      flash("✓ Listing submitted for admin review.");
      setActiveSection("listings");
      void loadAll();
    } catch { flash("✗ Failed to create listing."); }
  };

  const markSold = async (listing: ListingSummary) => {
    await agentApi.updateListing(listing.id, { status: "SOLD" });
    flash("✓ Listing marked as sold.");
    void loadAll();
  };

  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await agentApi.deleteListing(id);
    flash("✓ Listing deleted.");
    void loadAll();
  };

  const respondInquiry = async (id: string) => {
    const msg = inquiryResponses[id]?.trim();
    if (!msg) return;
    await agentApi.respondToInquiry(id, msg);
    setInquiryResponses(prev => ({ ...prev, [id]: "" }));
    flash("✓ Response sent.");
  };

  const confirmTour = async (id: string) => {
    await agentApi.updateTourRequest(id, "CONFIRMED");
    flash("✓ Tour confirmed.");
    void loadAll();
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUrl.trim()) return;
    try {
      await agentApi.submitApplication({
        notes: "Submitted from agent dashboard",
        licenseDocuments: [{ fileUrl: docUrl.trim(), mimeType: "application/pdf" }],
      });
      setDocUrl("");
      flash("✓ Application submitted for review!");
      void loadAll();
    } catch { flash("✗ Failed to submit."); }
  };

  const stats = {
    active: listings.filter(l => l.status === "APPROVED").length,
    pending: listings.filter(l => l.status === "PENDING").length,
    sold: listings.filter(l => l.status === "SOLD").length,
    messages: inquiries.length,
  };

  const navItems: { key: Section; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: "bi-speedometer2" },
    { key: "listings", label: "My Listings", icon: "bi-house-door", badge: stats.active },
    { key: "create", label: "New Listing", icon: "bi-plus-circle" },
    { key: "inquiries", label: "Inquiries", icon: "bi-chat-left-dots", badge: inquiries.length },
    { key: "profile", label: "Verification", icon: "bi-person-badge" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>

        {/* Sidebar */}
        <nav style={{ width: "220px", background: "white", borderRight: "1px solid rgba(0,0,0,0.06)", padding: "2rem 1rem", flexShrink: 0 }}>
          <div style={{ marginBottom: "1.5rem", padding: "0 0.5rem" }}>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>Agent Portal</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>Manage your listings</div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
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
            <div style={{ background: msg.startsWith("✓") ? "var(--success)" : "#ef4444", color: "white", padding: "0.75rem 1.5rem", borderRadius: "var(--border-radius-sm)", marginBottom: "1.5rem", fontWeight: 600 }}>
              {msg}
            </div>
          )}

          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Dashboard Overview</h1>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
                {[
                  { label: "Active Listings", value: stats.active, icon: "bi-house-check", color: "var(--success)" },
                  { label: "Pending Review", value: stats.pending, icon: "bi-clock", color: "var(--warning)" },
                  { label: "Sold", value: stats.sold, icon: "bi-bag-check", color: "var(--primary-color)" },
                  { label: "Inquiries", value: stats.messages, icon: "bi-chat-dots", color: "var(--secondary-color)" },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding: "1.5rem", borderLeft: `4px solid ${s.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-light)", marginBottom: "0.5rem" }}>{s.label}</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800 }}>{s.value}</div>
                      </div>
                      <i className={`bi ${s.icon}`} style={{ fontSize: "1.5rem", color: s.color, opacity: 0.7 }}></i>
                    </div>
                  </div>
                ))}
              </div>

              {/* Verification status callout */}
              {verification && verification.status !== "VERIFIED" && (
                <div style={{ background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))", borderRadius: "var(--border-radius-md)", padding: "2rem", color: "white", marginBottom: "2rem" }}>
                  <h3 style={{ color: "white", fontWeight: 800, marginBottom: "0.5rem" }}>
                    <i className="bi bi-shield-exclamation me-2"></i>Verification Required
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: "1rem" }}>
                    Your listings won't go live until your agent license is reviewed and approved.
                    Status: <strong>{verification.applicationStatus || "NOT SUBMITTED"}</strong>
                  </p>
                  <button onClick={() => setActiveSection("profile")} style={{ background: "white", color: "var(--primary-color)", border: "none", padding: "0.5rem 1.5rem", borderRadius: "50px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Submit License →
                  </button>
                </div>
              )}

              {/* Recent inquiries preview */}
              <div className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>Recent Inquiries</h4>
                  <button onClick={() => setActiveSection("inquiries")} style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>View All →</button>
                </div>
                {inquiries.length === 0 ? <p className="text-muted">No inquiries yet.</p> : inquiries.slice(0, 3).map(inq => (
                  <div key={inq.id} style={{ padding: "1rem", border: "1px solid rgba(0,0,0,0.05)", borderRadius: "8px", marginBottom: "0.5rem" }}>
                    <p style={{ margin: 0, color: "var(--text-secondary)" }}>{inq.message}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* MY LISTINGS */}
          {activeSection === "listings" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h1 style={{ fontWeight: 800, margin: 0 }}>My Listings</h1>
                <button onClick={() => setActiveSection("create")} className="btn btn-primary">
                  <i className="bi bi-plus-lg me-1"></i>New Listing
                </button>
              </div>
              <div className="card" style={{ padding: "0.5rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.05)" }}>
                      {["Property", "Price", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "1rem", textAlign: h === "Actions" ? "right" : "left", color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listings.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>No listings yet. <button onClick={() => setActiveSection("create")} style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontWeight: 600 }}>Create one →</button></td></tr>
                    ) : listings.map(listing => (
                      <tr key={listing.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <img src={listing.mediaUrls?.[0] || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=80&q=80"} style={{ width: "56px", height: "56px", borderRadius: "8px", objectFit: "cover" }} alt="" />
                            <div>
                              <div style={{ fontWeight: 600 }}>{listing.location}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>{listing.propertyType || "Property"}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "1rem", fontWeight: 700 }}>${listing.price.toLocaleString()}</td>
                        <td style={{ padding: "1rem" }}>
                          <span className={`badge ${listing.status === "APPROVED" ? "badge-success" : listing.status === "PENDING" ? "badge-warning" : "badge-danger"}`}>{listing.status}</span>
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <button onClick={() => markSold(listing)} className="btn btn-outline" disabled={listing.status === "SOLD"} style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem", marginRight: "0.5rem" }}>Mark Sold</button>
                          <button onClick={() => deleteListing(listing.id)} className="btn btn-outline" style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* CREATE LISTING */}
          {activeSection === "create" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Create New Listing</h1>
              <div className="card" style={{ padding: "2rem", maxWidth: "680px" }}>
                <form onSubmit={createListing}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                    <div className="form-group">
                      <label className="form-label text-muted">Location / Address</label>
                      <input className="form-control" required placeholder="123 Main St, Austin, TX"
                        value={newListing.location} onChange={e => setNewListing(n => ({ ...n, location: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Price (USD)</label>
                      <input className="form-control" type="number" required min="1" placeholder="500000"
                        value={newListing.price} onChange={e => setNewListing(n => ({ ...n, price: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                    <label className="form-label text-muted">Property Type</label>
                    <select className="form-control" value={newListing.propertyType} onChange={e => setNewListing(n => ({ ...n, propertyType: e.target.value }))}>
                      {["House", "Condo", "Townhouse", "Land"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                    <label className="form-label text-muted">Description</label>
                    <textarea className="form-control" required rows={5} placeholder="Describe the property..."
                      value={newListing.description} onChange={e => setNewListing(n => ({ ...n, description: e.target.value }))}></textarea>
                  </div>
                  <div className="form-group" style={{ marginBottom: "2rem" }}>
                    <label className="form-label text-muted">Media URLs (comma-separated)</label>
                    <input className="form-control" placeholder="https://example.com/photo1.jpg, ..."
                      value={newListing.mediaUrls} onChange={e => setNewListing(n => ({ ...n, mediaUrls: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button type="submit" className="btn btn-primary">Submit for Review</button>
                    <button type="button" className="btn btn-outline" onClick={() => setActiveSection("listings")}>Cancel</button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* INQUIRIES */}
          {activeSection === "inquiries" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Inquiries & Tour Requests</h1>

              <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Messages</h3>
              <div className="card" style={{ marginBottom: "2rem" }}>
                {inquiries.length === 0 ? (
                  <p className="text-muted" style={{ padding: "2rem" }}>No inquiries yet.</p>
                ) : inquiries.map(inq => (
                  <div key={inq.id} style={{ padding: "1.25rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <p style={{ fontWeight: 500, marginBottom: "0.75rem" }}>{inq.message}</p>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input className="form-control" placeholder="Reply..." style={{ flex: 1 }}
                        value={inquiryResponses[inq.id] || ""}
                        onChange={e => setInquiryResponses(prev => ({ ...prev, [inq.id]: e.target.value }))} />
                      <button className="btn btn-primary" onClick={() => respondInquiry(inq.id)} style={{ flexShrink: 0 }}>Reply</button>
                    </div>
                  </div>
                ))}
              </div>

              <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>Tour Requests</h3>
              <div className="card">
                {tourRequests.length === 0 ? (
                  <p className="text-muted" style={{ padding: "2rem" }}>No tour requests.</p>
                ) : tourRequests.map(tour => (
                  <div key={tour.id} style={{ padding: "1.25rem", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{new Date(tour.preferredTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      <span className={`badge ${tour.status === "CONFIRMED" ? "badge-success" : "badge-warning"}`}>{tour.status}</span>
                    </div>
                    {tour.status === "REQUESTED" && (
                      <button onClick={() => confirmTour(tour.id)} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>Confirm Tour</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* VERIFICATION */}
          {activeSection === "profile" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>License Verification</h1>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                <div className="card" style={{ flex: 1, minWidth: "280px", padding: "2rem" }}>
                  <h4 style={{ fontWeight: 800, marginBottom: "1.5rem" }}>Current Status</h4>
                  <div style={{ background: "var(--bg-primary)", borderRadius: "8px", padding: "1.5rem", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-light)", marginBottom: "0.5rem" }}>Agent Role</div>
                    <span className={`badge ${verification?.status === "VERIFIED" ? "badge-success" : "badge-warning"}`} style={{ fontSize: "1rem" }}>
                      {verification?.status || "UNVERIFIED"}
                    </span>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: "8px", padding: "1.5rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-light)", marginBottom: "0.5rem" }}>Application</div>
                    <div style={{ fontWeight: 700 }}>{verification?.applicationStatus || "NOT SUBMITTED"}</div>
                  </div>
                </div>
                <div className="card" style={{ flex: 2, minWidth: "320px", padding: "2rem" }}>
                  <h4 style={{ fontWeight: 800, marginBottom: "1rem" }}>Submit License Document</h4>
                  <div style={{ borderLeft: "4px solid var(--primary-color)", paddingLeft: "1rem", marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
                    Your license must be reviewed by an admin before your listings go live to the public.
                  </div>
                  <form onSubmit={submitApplication}>
                    <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                      <label className="form-label text-muted">License Document URL (PDF or image link)</label>
                      <input type="url" className="form-control" required placeholder="https://example.com/my-license.pdf"
                        value={docUrl} onChange={e => setDocUrl(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={verification?.applicationStatus === "PENDING"}>
                      {verification?.applicationStatus === "PENDING" ? "Under Review" : "Submit Application"}
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};
