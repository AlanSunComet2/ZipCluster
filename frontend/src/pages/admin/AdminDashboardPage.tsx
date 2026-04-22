import { useEffect, useMemo, useState } from "react";
import {
  createAdminApi,
  type AdminBanner,
  type AdminCategory,
  type AdminListingDetails,
  type AdminListingSummary,
  type AdminListingStatus,
  type AdminListingUpdatePayload,
  type AdminPendingAgent,
  type AdminUser,
  type ResetPasswordResponse,
} from "../../api/admin";
import { useApiClient } from "../../auth/useApiClient";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { ChangePasswordForm } from "../../components/account/ChangePasswordForm";

type Section =
  | "overview"
  | "listings"
  | "agents"
  | "users"
  | "categories"
  | "content"
  | "reports"
  | "security";

type ListingFilter = AdminListingStatus | "ALL";

interface Stats {
  totalUsers: number;
  totalAgents: number;
  totalListings: number;
  pendingListings: number;
  pendingAgentApplications: number;
  totalFavorites: number;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

const formatPrice = (value: number): string =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const compactId = (id: string): string => (id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-6)}` : id);

const SHARED_MODAL_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 50,
  padding: "1rem",
};

const MODAL_CARD: React.CSSProperties = {
  background: "white",
  borderRadius: "var(--border-radius)",
  padding: "2rem",
  maxWidth: "640px",
  width: "100%",
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};

interface Modal {
  kind:
    | "rejectAgent"
    | "requestDocs"
    | "viewAgent"
    | "rejectListing"
    | "approveListing"
    | "viewListing"
    | "editListing"
    | "deleteListing"
    | "resetPassword"
    | "scheduleReport"
    | "createBanner"
    | "createCategory"
    | "createGeo";
  data?: unknown;
}

export const AdminDashboardPage = (): JSX.Element => {
  const client = useApiClient();
  const adminApi = useMemo(() => createAdminApi(client), [client]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const [stats, setStats] = useState<Stats | null>(null);
  const [listings, setListings] = useState<AdminListingSummary[]>([]);
  const [listingFilter, setListingFilter] = useState<ListingFilter>("PENDING");
  const [pendingAgents, setPendingAgents] = useState<AdminPendingAgent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [propertyCategories, setPropertyCategories] = useState<AdminCategory[]>([]);
  const [geoCategories, setGeoCategories] = useState<AdminCategory[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);

  const [modal, setModal] = useState<Modal | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");

  const [listingDetails, setListingDetails] = useState<AdminListingDetails | null>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<
    (ResetPasswordResponse & { email: string }) | null
  >(null);
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});

  const flash = (text: string): void => {
    setMsg(text);
    setErrorMsg("");
    window.setTimeout(() => setMsg(""), 4000);
  };
  const flashError = (text: string): void => {
    setErrorMsg(text);
    window.setTimeout(() => setErrorMsg(""), 6000);
  };

  const closeModal = (): void => {
    setModal(null);
    setModalBusy(false);
    setModalError("");
    setListingDetails(null);
  };

  const loadCore = async (): Promise<void> => {
    setLoading(true);
    try {
      const [analytics, agents, usersRes] = await Promise.all([
        adminApi.getAnalyticsOverview(),
        adminApi.getPendingAgents(),
        adminApi.listUsers(),
      ]);
      setStats(analytics);
      setPendingAgents(agents.items);
      setUsers(usersRes.items);
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async (filter: ListingFilter): Promise<void> => {
    try {
      const res = await adminApi.getListings(filter);
      setListings(res.items);
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to load listings.");
    }
  };

  const loadCategories = async (): Promise<void> => {
    try {
      const [props, geos] = await Promise.all([
        adminApi.listPropertyCategories(),
        adminApi.listGeoCategories(),
      ]);
      setPropertyCategories(props.items);
      setGeoCategories(geos.items);
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to load categories.");
    }
  };

  const loadBanners = async (): Promise<void> => {
    try {
      const res = await adminApi.listBanners();
      setBanners(res.items);
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to load banners.");
    }
  };

  useEffect(() => {
    void loadCore();
    void loadListings(listingFilter);
    void loadCategories();
    void loadBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminApi]);

  useEffect(() => {
    void loadListings(listingFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingFilter]);

  // ----- Listings -----
  const approveListing = async (id: string, notes: string): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.approveListing(id, notes || "Approved by admin.");
      flash("Listing approved and now live.");
      closeModal();
      await Promise.all([loadListings(listingFilter), loadCore()]);
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to approve listing.");
    } finally {
      setModalBusy(false);
    }
  };
  const rejectListing = async (id: string, notes: string): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.rejectListing(id, notes);
      flash("Listing sent back for revision.");
      closeModal();
      await Promise.all([loadListings(listingFilter), loadCore()]);
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to reject listing.");
    } finally {
      setModalBusy(false);
    }
  };
  const openListingDetails = async (listing: AdminListingSummary): Promise<void> => {
    setModal({ kind: "viewListing", data: listing });
    setListingDetails(null);
    try {
      const details = await adminApi.getListingDetails(listing.id);
      setListingDetails(details);
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to load listing details.");
    }
  };
  const openEditListing = async (listing: AdminListingSummary): Promise<void> => {
    setModal({ kind: "editListing", data: listing });
    setListingDetails(null);
    try {
      const details = await adminApi.getListingDetails(listing.id);
      setListingDetails(details);
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to load listing details.");
    }
  };
  const updateListing = async (
    id: string,
    payload: AdminListingUpdatePayload,
  ): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.updateListing(id, payload);
      flash("Listing updated.");
      closeModal();
      await Promise.all([loadListings(listingFilter), loadCore()]);
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to update listing.");
    } finally {
      setModalBusy(false);
    }
  };
  const deleteListing = async (id: string, notes: string): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.deleteListing(id, notes || undefined);
      flash("Listing removed.");
      closeModal();
      await Promise.all([loadListings(listingFilter), loadCore()]);
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to remove listing.");
    } finally {
      setModalBusy(false);
    }
  };

  // ----- Agents -----
  const approveAgent = async (id: string): Promise<void> => {
    try {
      await adminApi.approveAgent(id);
      flash("Agent application approved.");
      await Promise.all([loadCore()]);
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to approve agent.");
    }
  };
  const rejectAgent = async (id: string, notes: string): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.rejectAgent(id, notes);
      flash("Agent application rejected. Applicant has been notified.");
      closeModal();
      await Promise.all([loadCore()]);
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to reject agent.");
    } finally {
      setModalBusy(false);
    }
  };
  const requestAgentDocs = async (id: string, message: string): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.requestAgentDocuments(id, message);
      flash("Document request sent to applicant.");
      closeModal();
      await loadCore();
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to send request.");
    } finally {
      setModalBusy(false);
    }
  };

  // ----- Users -----
  const toggleUser = async (u: AdminUser): Promise<void> => {
    try {
      if (u.isActive) await adminApi.deactivateUser(u.id);
      else await adminApi.reactivateUser(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
      flash(`User ${u.isActive ? "deactivated" : "reactivated"}.`);
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to update user.");
    }
  };
  const resetPassword = async (u: AdminUser): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      const res = await adminApi.resetUserPassword(u.id);
      setResetPasswordResult({ ...res, email: u.email });
      flash("Password reset link generated.");
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to reset password.");
    } finally {
      setModalBusy(false);
    }
  };

  // ----- Categories -----
  const createPropertyCategory = async (name: string): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.createPropertyCategory(name);
      flash(`Property type "${name}" added.`);
      closeModal();
      await loadCategories();
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to create category.");
    } finally {
      setModalBusy(false);
    }
  };
  const createGeoCategory = async (name: string): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.createGeoCategory(name);
      flash(`Location "${name}" added.`);
      closeModal();
      await loadCategories();
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to create location.");
    } finally {
      setModalBusy(false);
    }
  };
  const deletePropertyCategory = async (id: string, name: string): Promise<void> => {
    if (!window.confirm(`Delete property type "${name}"?`)) return;
    try {
      await adminApi.deletePropertyCategory(id);
      flash("Property type deleted.");
      await loadCategories();
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to delete.");
    }
  };
  const deleteGeoCategory = async (id: string, name: string): Promise<void> => {
    if (!window.confirm(`Delete location "${name}"?`)) return;
    try {
      await adminApi.deleteGeoCategory(id);
      flash("Location deleted.");
      await loadCategories();
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to delete.");
    }
  };

  // ----- Banners -----
  const createBanner = async (payload: {
    title: string;
    imageUrl: string;
    ctaText?: string;
    ctaUrl?: string;
  }): Promise<void> => {
    setModalBusy(true);
    setModalError("");
    try {
      await adminApi.createBanner({ ...payload, isActive: true });
      flash("Banner created.");
      closeModal();
      await loadBanners();
    } catch (error: unknown) {
      setModalError(error instanceof Error ? error.message : "Failed to create banner.");
    } finally {
      setModalBusy(false);
    }
  };
  const toggleBanner = async (banner: AdminBanner): Promise<void> => {
    try {
      await adminApi.updateBanner(banner.id, { isActive: !banner.isActive });
      flash(`Banner ${banner.isActive ? "hidden" : "published"}.`);
      await loadBanners();
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to update banner.");
    }
  };
  const deleteBanner = async (id: string): Promise<void> => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await adminApi.deleteBanner(id);
      flash("Banner deleted.");
      await loadBanners();
    } catch (error: unknown) {
      flashError(error instanceof Error ? error.message : "Failed to delete banner.");
    }
  };

  const navItems: { key: Section; label: string; icon: string; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: "bi-speedometer2" },
    { key: "listings", label: "Moderate Listings", icon: "bi-house-check", badge: stats?.pendingListings },
    { key: "agents", label: "Agent Applications", icon: "bi-person-badge", badge: pendingAgents.length },
    { key: "users", label: "Manage Users", icon: "bi-people" },
    { key: "categories", label: "Categories & Locations", icon: "bi-tags" },
    { key: "content", label: "Site Content", icon: "bi-layout-text-window" },
    { key: "reports", label: "Reports", icon: "bi-bar-chart" },
    { key: "security", label: "Account Security", icon: "bi-shield-lock" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <nav style={{ width: "240px", background: "white", borderRight: "1px solid rgba(0,0,0,0.06)", padding: "2rem 1rem", flexShrink: 0 }}>
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

        {/* Main */}
        <main style={{ flex: 1, padding: "2.5rem", background: "var(--bg-primary)", overflowY: "auto" }}>
          {msg && (
            <div style={{ background: "var(--success)", color: "white", padding: "0.75rem 1.5rem", borderRadius: "var(--border-radius-sm)", marginBottom: "1rem", fontWeight: 600 }}>{msg}</div>
          )}
          {errorMsg && (
            <div style={{ background: "var(--danger,#ef4444)", color: "white", padding: "0.75rem 1.5rem", borderRadius: "var(--border-radius-sm)", marginBottom: "1rem", fontWeight: 600 }}>{errorMsg}</div>
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

          {/* LISTINGS */}
          {activeSection === "listings" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "1rem" }}>Moderate Property Listings</h1>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {(["PENDING", "APPROVED", "SOLD", "ALL"] as ListingFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setListingFilter(f)}
                    className={listingFilter === f ? "btn btn-primary" : "btn btn-outline"}
                    style={{ padding: "0.45rem 1.1rem", fontSize: "0.85rem", textTransform: "capitalize" }}
                  >
                    {f.toLowerCase()}
                  </button>
                ))}
              </div>

              <div className="card" style={{ padding: "0.5rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.05)" }}>
                      {["Listing ID", "Address", "Price", "Status", "Submitted", "Actions"].map(h => (
                        <th key={h} style={{ padding: "1rem", textAlign: h === "Actions" ? "right" : "left", color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listings.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>No listings match this filter.</td></tr>
                    ) : listings.map(listing => (
                      <tr key={listing.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.85rem" }}>{compactId(listing.id)}</td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ fontWeight: 600 }}>{listing.location}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>{listing.propertyType || "—"}{listing.zipCode ? ` · ${listing.zipCode}` : ""}</div>
                        </td>
                        <td style={{ padding: "1rem", fontWeight: 600 }}>{formatPrice(listing.price)}</td>
                        <td style={{ padding: "1rem" }}>
                          <span className={`badge ${listing.status === "APPROVED" ? "badge-success" : listing.status === "PENDING" ? "badge-warning" : "badge-primary"}`}>{listing.status}</span>
                        </td>
                        <td style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--text-light)" }}>{formatDate(listing.createdAt)}</td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <button onClick={() => openListingDetails(listing)} className="btn btn-outline" style={{ marginRight: "0.5rem", padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}>View</button>
                          <button onClick={() => openEditListing(listing)} className="btn btn-outline" style={{ marginRight: "0.5rem", padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}>Edit</button>
                          {listing.status === "PENDING" && (
                            <>
                              <button onClick={() => setModal({ kind: "approveListing", data: listing })} className="btn btn-primary" style={{ marginRight: "0.5rem", padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}>Approve</button>
                              <button onClick={() => setModal({ kind: "rejectListing", data: listing })} className="btn btn-outline" style={{ marginRight: "0.5rem", padding: "0.35rem 0.85rem", fontSize: "0.8rem", color: "var(--warning,#f59e0b)", borderColor: "var(--warning,#f59e0b)" }}>Reject</button>
                            </>
                          )}
                          <button
                            onClick={() => setModal({ kind: "deleteListing", data: listing })}
                            className="btn btn-outline"
                            style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}
                          >
                            Delete
                          </button>
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
                      {["Application ID", "Applicant", "Email", "Submitted", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "1rem", textAlign: h === "Actions" ? "right" : "left", color: "var(--text-light)", fontSize: "0.8rem", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAgents.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>No pending applications.</td></tr>
                    ) : pendingAgents.map(agent => {
                      const applicantName = agent.email?.split("@")[0]?.replace(/[._-]/g, " ") || "Applicant";
                      const submitted = agent.application?.createdAt ?? agent.createdAt;
                      return (
                        <tr key={agent.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                          <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>
                            {agent.application ? compactId(agent.application.id) : <span style={{ color: "var(--text-light)" }}>— no app —</span>}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(applicantName)}&background=random&color=fff&size=40`} style={{ width: "40px", height: "40px", borderRadius: "50%" }} alt="" />
                              <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{applicantName}</div>
                            </div>
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.9rem" }}>{agent.email}</td>
                          <td style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--text-light)" }}>{formatDate(submitted)}</td>
                          <td style={{ padding: "1rem" }}>
                            <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                              {agent.application?.status ?? "NO APPLICATION"}
                            </span>
                          </td>
                          <td style={{ padding: "1rem", textAlign: "right" }}>
                            <button onClick={() => setModal({ kind: "viewAgent", data: agent })} className="btn btn-outline" style={{ marginRight: "0.5rem", padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}>Review</button>
                            <button onClick={() => approveAgent(agent.id)} className="btn btn-primary" style={{ marginRight: "0.5rem", padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}>Approve</button>
                            <button onClick={() => setModal({ kind: "rejectAgent", data: agent })} className="btn btn-outline" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>Reject</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* USERS */}
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
                              <div style={{ fontSize: "0.75rem", color: "var(--text-light)", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ fontFamily: "monospace" }}>
                                  ID: {expandedUserIds[user.id] ? user.id : compactId(user.id)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedUserIds(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                                  className="btn btn-outline"
                                  style={{ padding: "0.15rem 0.5rem", fontSize: "0.7rem" }}
                                >
                                  {expandedUserIds[user.id] ? "Hide ID" : "Show ID"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { void navigator.clipboard?.writeText(user.id); }}
                                  className="btn btn-outline"
                                  style={{ padding: "0.15rem 0.5rem", fontSize: "0.7rem" }}
                                >
                                  Copy ID
                                </button>
                              </div>
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
                          <button
                            onClick={() => { setResetPasswordResult(null); setModal({ kind: "resetPassword", data: user }); }}
                            className="btn btn-outline"
                            style={{ marginRight: "0.5rem", padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
                          >
                            Reset Password
                          </button>
                          <button onClick={() => toggleUser(user)} className="btn btn-outline"
                            style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem", color: user.isActive ? "var(--danger,#ef4444)" : "var(--success)", borderColor: user.isActive ? "var(--danger,#ef4444)" : "var(--success)" }}>
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

          {/* CATEGORIES & LOCATIONS */}
          {activeSection === "categories" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Categories & Locations</h1>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
                {/* Property Types */}
                <div className="card" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>Property Types</h3>
                    <button onClick={() => setModal({ kind: "createCategory" })} className="btn btn-primary" style={{ padding: "0.35rem 0.9rem", fontSize: "0.85rem" }}>+ Add</button>
                  </div>
                  {propertyCategories.length === 0 ? (
                    <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>No property types.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {propertyCategories.map(c => (
                        <li key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                          <span style={{ fontWeight: 500 }}>{c.name}</span>
                          <button onClick={() => deletePropertyCategory(c.id, c.name)} className="btn btn-outline" style={{ padding: "0.25rem 0.7rem", fontSize: "0.75rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>Delete</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Locations */}
                <div className="card" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>Locations</h3>
                    <button onClick={() => setModal({ kind: "createGeo" })} className="btn btn-primary" style={{ padding: "0.35rem 0.9rem", fontSize: "0.85rem" }}>+ Add</button>
                  </div>
                  {geoCategories.length === 0 ? (
                    <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>No locations.</p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {geoCategories.map(c => (
                        <li key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                          <span style={{ fontWeight: 500 }}>{c.name}</span>
                          <button onClick={() => deleteGeoCategory(c.id, c.name)} className="btn btn-outline" style={{ padding: "0.25rem 0.7rem", fontSize: "0.75rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>Delete</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}

          {/* SITE CONTENT */}
          {activeSection === "content" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h1 style={{ fontWeight: 800, margin: 0 }}>Site Content & Banners</h1>
                <button onClick={() => setModal({ kind: "createBanner" })} className="btn btn-primary" style={{ padding: "0.55rem 1.2rem" }}>+ New Banner</button>
              </div>
              {banners.length === 0 ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-light)" }}>No banners. Create one to feature on the home page.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  {banners.map(b => (
                    <div key={b.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                      <img src={b.imageUrl} alt={b.title} style={{ width: "100%", height: "140px", objectFit: "cover" }} />
                      <div style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <div style={{ fontWeight: 700 }}>{b.title}</div>
                          <span className={`badge ${b.isActive ? "badge-success" : "badge-warning"}`}>{b.isActive ? "Live" : "Hidden"}</span>
                        </div>
                        {b.ctaText && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-light)", marginBottom: "0.75rem" }}>CTA: {b.ctaText}</div>
                        )}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => toggleBanner(b)} className="btn btn-outline" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", flex: 1 }}>{b.isActive ? "Hide" : "Publish"}</button>
                          <button onClick={() => deleteBanner(b.id)} className="btn btn-outline" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* REPORTS */}
          {activeSection === "reports" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Analytics & Reports</h1>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                {[
                  { label: "Approved Listings", value: listings.filter(l => l.status === "APPROVED").length, color: "var(--success)" },
                  { label: "Pending Listings", value: stats?.pendingListings ?? 0, color: "var(--warning)" },
                  { label: "Pending Agents", value: stats?.pendingAgentApplications ?? 0, color: "var(--danger,#ef4444)" },
                  { label: "Total Favorites", value: stats?.totalFavorites ?? 0, color: "#ec4899" },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding: "1.5rem", borderLeft: `4px solid ${s.color}` }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" }}>{s.label}</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>Scheduled Reports</div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-light)" }}>Automate delivery of platform analytics to your email.</div>
                </div>
                <button onClick={() => setModal({ kind: "scheduleReport" })} className="btn btn-primary" style={{ padding: "0.55rem 1.2rem" }}>Schedule Report</button>
              </div>
            </>
          )}

          {/* ACCOUNT SECURITY */}
          {activeSection === "security" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Account Security</h1>
              <p style={{ color: "var(--text-light)", marginBottom: "1.5rem" }}>
                Rotate your administrator password. All other admin sessions will be signed out immediately.
              </p>
              <ChangePasswordForm
                title="Change admin password"
                description="Updating your password will end every active admin session, including this one."
              />
            </>
          )}
        </main>
      </div>
      <Footer />

      {/* MODALS */}
      {modal && <ModalHost
        modal={modal}
        busy={modalBusy}
        error={modalError}
        onClose={closeModal}
        listingDetails={listingDetails}
        resetPasswordResult={resetPasswordResult}
        actions={{
          approveListing,
          rejectListing,
          updateListing,
          deleteListing,
          rejectAgent,
          requestAgentDocs,
          resetPassword,
          createPropertyCategory,
          createGeoCategory,
          createBanner,
          scheduleReport: (freq: string) => {
            flash(`"${freq}" report scheduled. Delivery will begin on the next cycle.`);
            closeModal();
          },
          openRequestDocs: (agent: AdminPendingAgent) => setModal({ kind: "requestDocs", data: agent }),
        }}
      />}
    </div>
  );
};

// --- Modal Host ---
interface ModalActions {
  approveListing: (id: string, notes: string) => Promise<void>;
  rejectListing: (id: string, notes: string) => Promise<void>;
  updateListing: (id: string, payload: AdminListingUpdatePayload) => Promise<void>;
  deleteListing: (id: string, notes: string) => Promise<void>;
  rejectAgent: (id: string, notes: string) => Promise<void>;
  requestAgentDocs: (id: string, message: string) => Promise<void>;
  resetPassword: (user: AdminUser) => Promise<void>;
  createPropertyCategory: (name: string) => Promise<void>;
  createGeoCategory: (name: string) => Promise<void>;
  createBanner: (payload: { title: string; imageUrl: string; ctaText?: string; ctaUrl?: string }) => Promise<void>;
  scheduleReport: (freq: string) => void;
  openRequestDocs: (agent: AdminPendingAgent) => void;
}

interface ModalHostProps {
  modal: Modal;
  busy: boolean;
  error: string;
  onClose: () => void;
  actions: ModalActions;
  listingDetails: AdminListingDetails | null;
  resetPasswordResult: (ResetPasswordResponse & { email: string }) | null;
}

const ModalHost = ({ modal, busy, error, onClose, actions, listingDetails, resetPasswordResult }: ModalHostProps): JSX.Element => {
  return (
    <div style={SHARED_MODAL_STYLE} onClick={onClose}>
      <div style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {modal.kind === "rejectAgent" && <RejectAgentModal agent={modal.data as AdminPendingAgent} busy={busy} error={error} onClose={onClose} onSubmit={actions.rejectAgent} />}
        {modal.kind === "requestDocs" && <RequestDocsModal agent={modal.data as AdminPendingAgent} busy={busy} error={error} onClose={onClose} onSubmit={actions.requestAgentDocs} />}
        {modal.kind === "viewAgent" && <ViewAgentModal agent={modal.data as AdminPendingAgent} onClose={onClose} onRequestDocs={actions.openRequestDocs} />}
        {modal.kind === "rejectListing" && <RejectListingModal listing={modal.data as AdminListingSummary} busy={busy} error={error} onClose={onClose} onSubmit={actions.rejectListing} />}
        {modal.kind === "approveListing" && <ApproveListingModal listing={modal.data as AdminListingSummary} busy={busy} error={error} onClose={onClose} onSubmit={actions.approveListing} />}
        {modal.kind === "viewListing" && <ViewListingModal listing={modal.data as AdminListingSummary} details={listingDetails} onClose={onClose} />}
        {modal.kind === "editListing" && <EditListingModal listing={modal.data as AdminListingSummary} details={listingDetails} busy={busy} error={error} onClose={onClose} onSubmit={actions.updateListing} />}
        {modal.kind === "deleteListing" && <DeleteListingModal listing={modal.data as AdminListingSummary} busy={busy} error={error} onClose={onClose} onSubmit={actions.deleteListing} />}
        {modal.kind === "resetPassword" && <ResetPasswordModal user={modal.data as AdminUser} busy={busy} error={error} result={resetPasswordResult} onClose={onClose} onSubmit={actions.resetPassword} />}
        {modal.kind === "scheduleReport" && <ScheduleReportModal onClose={onClose} onSubmit={actions.scheduleReport} />}
        {modal.kind === "createCategory" && <CreateCategoryModal title="Add Property Type" busy={busy} error={error} onClose={onClose} onSubmit={actions.createPropertyCategory} />}
        {modal.kind === "createGeo" && <CreateCategoryModal title="Add Location" busy={busy} error={error} onClose={onClose} onSubmit={actions.createGeoCategory} />}
        {modal.kind === "createBanner" && <CreateBannerModal busy={busy} error={error} onClose={onClose} onSubmit={actions.createBanner} />}
      </div>
    </div>
  );
};

// ---- Individual Modals ----

const ErrorBanner = ({ error }: { error: string }): JSX.Element | null =>
  error ? (
    <div style={{ background: "#fee2e2", color: "#991b1b", padding: "0.6rem 0.9rem", borderRadius: "var(--border-radius-sm)", marginBottom: "0.75rem", fontSize: "0.85rem" }}>{error}</div>
  ) : null;

const ModalTitle = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <h2 style={{ fontWeight: 800, marginBottom: "1rem" }}>{children}</h2>
);

const RejectAgentModal = ({ agent, busy, error, onClose, onSubmit }: { agent: AdminPendingAgent; busy: boolean; error: string; onClose: () => void; onSubmit: (id: string, notes: string) => Promise<void> }): JSX.Element => {
  const [reason, setReason] = useState("");
  return (
    <>
      <ModalTitle>Reject Agent Application</ModalTitle>
      <p style={{ color: "var(--text-light)", marginBottom: "1rem" }}>Applicant <strong>{agent.email}</strong> will be notified with your reasoning.</p>
      <ErrorBanner error={error} />
      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Rejection reason</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem", marginBottom: "1rem", fontFamily: "inherit" }} placeholder="e.g. License document is unreadable. Please resubmit a clearer scan." />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
        <button onClick={() => onSubmit(agent.id, reason.trim() || "Application rejected.")} className="btn btn-primary" disabled={busy || reason.trim().length < 3} style={{ background: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>
          {busy ? "Sending…" : "Send rejection"}
        </button>
      </div>
    </>
  );
};

const RequestDocsModal = ({ agent, busy, error, onClose, onSubmit }: { agent: AdminPendingAgent; busy: boolean; error: string; onClose: () => void; onSubmit: (id: string, message: string) => Promise<void> }): JSX.Element => {
  const [message, setMessage] = useState("Please upload a higher-resolution copy of your license and a recent utility bill.");
  return (
    <>
      <ModalTitle>Request Additional Documents</ModalTitle>
      <p style={{ color: "var(--text-light)", marginBottom: "1rem" }}>Send a request to <strong>{agent.email}</strong>.</p>
      <ErrorBanner error={error} />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginBottom: "1rem", fontFamily: "inherit" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
        <button onClick={() => onSubmit(agent.id, message.trim())} className="btn btn-primary" disabled={busy || message.trim().length < 3}>
          {busy ? "Sending…" : "Send request"}
        </button>
      </div>
    </>
  );
};

const ViewAgentModal = ({ agent, onClose, onRequestDocs }: { agent: AdminPendingAgent; onClose: () => void; onRequestDocs: (a: AdminPendingAgent) => void }): JSX.Element => {
  const app = agent.application;
  return (
    <>
      <ModalTitle>Application Review</ModalTitle>
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem 1rem", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
        <div style={{ color: "var(--text-light)" }}>Application ID</div>
        <div style={{ fontFamily: "monospace" }}>{app?.id ?? "— not submitted —"}</div>
        <div style={{ color: "var(--text-light)" }}>Email</div>
        <div>{agent.email}</div>
        <div style={{ color: "var(--text-light)" }}>Submitted</div>
        <div>{formatDate(app?.createdAt ?? agent.createdAt)}</div>
        <div style={{ color: "var(--text-light)" }}>Status</div>
        <div><span className="badge badge-warning">{app?.status ?? "NO APPLICATION"}</span></div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Application Notes</div>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", whiteSpace: "pre-wrap", fontSize: "0.9rem", minHeight: "60px" }}>
          {app?.notes?.trim() || <span style={{ color: "var(--text-light)" }}>No additional notes provided.</span>}
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>License Documents</div>
        {app?.licenseDocs?.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {app.licenseDocs.map(doc => (
              <li key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "#f9fafb", borderRadius: "var(--border-radius-sm)", border: "1px solid #e5e7eb" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{doc.fileUrl.split("/").pop()}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>{doc.mimeType} · uploaded {formatDate(doc.uploadedAt)}</div>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}>Open</a>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>No license documents uploaded.</div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <button onClick={() => onRequestDocs(agent)} className="btn btn-outline">Request more documents</button>
        <button onClick={onClose} className="btn btn-primary">Close</button>
      </div>
    </>
  );
};

const ApproveListingModal = ({ listing, busy, error, onClose, onSubmit }: { listing: AdminListingSummary; busy: boolean; error: string; onClose: () => void; onSubmit: (id: string, notes: string) => Promise<void> }): JSX.Element => {
  const [notes, setNotes] = useState("Approved by admin.");
  return (
    <>
      <ModalTitle>Approve Listing</ModalTitle>
      <p style={{ marginBottom: "1rem", color: "var(--text-light)" }}><strong>{listing.location}</strong> — {formatPrice(listing.price)}</p>
      <ErrorBanner error={error} />
      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Moderation note (optional)</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem", marginBottom: "1rem", fontFamily: "inherit" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
        <button onClick={() => onSubmit(listing.id, notes.trim())} className="btn btn-primary" disabled={busy}>{busy ? "Approving…" : "Approve"}</button>
      </div>
    </>
  );
};

const RejectListingModal = ({ listing, busy, error, onClose, onSubmit }: { listing: AdminListingSummary; busy: boolean; error: string; onClose: () => void; onSubmit: (id: string, notes: string) => Promise<void> }): JSX.Element => {
  const [notes, setNotes] = useState("");
  return (
    <>
      <ModalTitle>Reject / Request Revision</ModalTitle>
      <p style={{ marginBottom: "1rem", color: "var(--text-light)" }}><strong>{listing.location}</strong> — the agent will receive your notes.</p>
      <ErrorBanner error={error} />
      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Reason / required changes</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem", marginBottom: "1rem", fontFamily: "inherit" }} placeholder="e.g. Photos appear watermarked from another listing. Please upload original images." />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
        <button onClick={() => onSubmit(listing.id, notes.trim() || "Listing requires revision.")} className="btn btn-primary" disabled={busy || notes.trim().length < 3} style={{ background: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>{busy ? "Sending…" : "Send back for revision"}</button>
      </div>
    </>
  );
};

const ViewListingModal = ({ listing, details, onClose }: { listing: AdminListingSummary; details: AdminListingDetails | null; onClose: () => void }): JSX.Element => {
  const images = details?.mediaUrls ?? listing.mediaUrls;
  return (
    <>
      <ModalTitle>Listing Details</ModalTitle>
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.5rem", marginBottom: "1rem" }}>
          {images.map((url, i) => (
            <img key={i} src={url} alt={`photo ${i + 1}`} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "var(--border-radius-sm)" }} />
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem 1rem", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
        <div style={{ color: "var(--text-light)" }}>Listing ID</div>
        <div style={{ fontFamily: "monospace" }}>{listing.id}</div>
        <div style={{ color: "var(--text-light)" }}>Address</div>
        <div>{listing.location}{listing.zipCode ? `, ${listing.zipCode}` : ""}</div>
        <div style={{ color: "var(--text-light)" }}>Price</div>
        <div style={{ fontWeight: 600 }}>{formatPrice(listing.price)}</div>
        <div style={{ color: "var(--text-light)" }}>Property Type</div>
        <div>{listing.propertyType || "—"}</div>
        <div style={{ color: "var(--text-light)" }}>Status</div>
        <div><span className={`badge ${listing.status === "APPROVED" ? "badge-success" : listing.status === "PENDING" ? "badge-warning" : "badge-primary"}`}>{listing.status}</span></div>
        <div style={{ color: "var(--text-light)" }}>Submitted</div>
        <div>{formatDate(listing.createdAt)}</div>
        {details?.agent && <>
          <div style={{ color: "var(--text-light)" }}>Agent</div>
          <div>{details.agent.email}</div>
        </>}
      </div>
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Description</div>
        <div style={{ background: "#f9fafb", padding: "0.75rem", borderRadius: "var(--border-radius-sm)", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{listing.description}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} className="btn btn-primary">Close</button>
      </div>
    </>
  );
};

const EditListingModal = ({
  listing,
  details,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  listing: AdminListingSummary;
  details: AdminListingDetails | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (id: string, payload: AdminListingUpdatePayload) => Promise<void>;
}): JSX.Element => {
  const source = details ?? listing;
  const [price, setPrice] = useState(String(source.price ?? ""));
  const [location, setLocation] = useState(source.location ?? "");
  const [zipCode, setZipCode] = useState(source.zipCode ?? "");
  const [propertyType, setPropertyType] = useState(source.propertyType ?? "");
  const [description, setDescription] = useState(source.description ?? "");
  const [status, setStatus] = useState<AdminListingStatus>(
    (source.status as AdminListingStatus) ?? "PENDING",
  );
  const [mediaUrlsText, setMediaUrlsText] = useState(
    (source.mediaUrls ?? []).join("\n"),
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!details) return;
    setPrice(String(details.price ?? ""));
    setLocation(details.location ?? "");
    setZipCode(details.zipCode ?? "");
    setPropertyType(details.propertyType ?? "");
    setDescription(details.description ?? "");
    setStatus((details.status as AdminListingStatus) ?? "PENDING");
    setMediaUrlsText((details.mediaUrls ?? []).join("\n"));
  }, [details]);

  const save = (): void => {
    const payload: AdminListingUpdatePayload = { notes: notes.trim() || undefined };
    const priceNumber = Number(price);
    if (!Number.isNaN(priceNumber) && priceNumber > 0 && priceNumber !== listing.price) {
      payload.price = priceNumber;
    }
    if (location.trim() && location.trim() !== listing.location) {
      payload.location = location.trim();
    }
    if (zipCode.trim() !== (listing.zipCode ?? "")) {
      payload.zipCode = zipCode.trim() || undefined;
    }
    if (propertyType.trim() && propertyType.trim() !== (listing.propertyType ?? "")) {
      payload.propertyType = propertyType.trim();
    }
    if (description.trim() && description.trim() !== listing.description) {
      payload.description = description.trim();
    }
    if (status !== listing.status) {
      payload.status = status;
    }
    const urls = mediaUrlsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const originalUrls = listing.mediaUrls ?? [];
    if (urls.join("|") !== originalUrls.join("|")) {
      payload.mediaUrls = urls;
    }
    void onSubmit(listing.id, payload);
  };

  return (
    <>
      <ModalTitle>Edit Listing</ModalTitle>
      <p style={{ color: "var(--text-light)", marginBottom: "1rem", fontSize: "0.9rem" }}>
        Editing <strong>{listing.location}</strong>. Changes are audited and immediately visible to the agent.
      </p>
      <ErrorBanner error={error} />
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Price (USD)
          <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="form-control" style={{ marginTop: "0.25rem" }} />
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Address / location
          <input value={location} onChange={(e) => setLocation(e.target.value)} className="form-control" style={{ marginTop: "0.25rem" }} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>ZIP code
            <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="form-control" style={{ marginTop: "0.25rem" }} />
          </label>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Property type
            <input value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="form-control" style={{ marginTop: "0.25rem" }} placeholder="House, Condo, …" />
          </label>
        </div>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Status
          <select value={status} onChange={(e) => setStatus(e.target.value as AdminListingStatus)} className="form-control" style={{ marginTop: "0.25rem" }}>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SOLD">SOLD</option>
          </select>
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="form-control" style={{ marginTop: "0.25rem", fontFamily: "inherit" }} />
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Media URLs (one per line)
          <textarea value={mediaUrlsText} onChange={(e) => setMediaUrlsText(e.target.value)} rows={3} className="form-control" style={{ marginTop: "0.25rem", fontFamily: "monospace", fontSize: "0.8rem" }} />
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Moderation note (optional)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="form-control" style={{ marginTop: "0.25rem" }} placeholder="Reason for edit (kept in moderation log)" />
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
        <button onClick={save} className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
};

const DeleteListingModal = ({
  listing,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  listing: AdminListingSummary;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (id: string, notes: string) => Promise<void>;
}): JSX.Element => {
  const [confirmText, setConfirmText] = useState("");
  const [notes, setNotes] = useState("");
  const canSubmit = confirmText.trim().toUpperCase() === "DELETE" && !busy;
  return (
    <>
      <ModalTitle>Remove Listing</ModalTitle>
      <div
        style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          padding: "0.75rem",
          borderRadius: "var(--border-radius-sm)",
          color: "#991b1b",
          fontSize: "0.85rem",
          marginBottom: "1rem",
        }}
      >
        You are about to remove <strong>{listing.location}</strong> (ID <code>{listing.id}</code>).
        The listing will no longer appear to buyers or the agent, but historical records
        (moderation, inquiries) are retained for compliance.
      </div>
      <ErrorBanner error={error} />
      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Reason (optional)
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="form-control" style={{ marginTop: "0.25rem", marginBottom: "0.75rem" }} placeholder="e.g. Duplicate listing or fraud report." />
      </label>
      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
        Type <code>DELETE</code> to confirm
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="form-control"
          autoComplete="off"
          style={{ marginTop: "0.25rem", marginBottom: "1rem", fontFamily: "monospace" }}
          placeholder="DELETE"
        />
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
        <button
          onClick={() => onSubmit(listing.id, notes.trim())}
          className="btn btn-primary"
          disabled={!canSubmit}
          style={{ background: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}
        >
          {busy ? "Removing…" : "Remove listing"}
        </button>
      </div>
    </>
  );
};

const ResetPasswordModal = ({ user, busy, error, result, onClose, onSubmit }: { user: AdminUser; busy: boolean; error: string; result: (ResetPasswordResponse & { email: string }) | null; onClose: () => void; onSubmit: (u: AdminUser) => Promise<void> }): JSX.Element => {
  return (
    <>
      <ModalTitle>Reset Password</ModalTitle>
      <p style={{ marginBottom: "1rem", color: "var(--text-light)" }}>
        Generate a temporary password for <strong>{user.email}</strong>. Share it securely and ask them to change it after login.
      </p>
      <ErrorBanner error={error} />
      {!result ? (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
          <button onClick={() => onSubmit(user)} className="btn btn-primary" disabled={busy}>{busy ? "Generating…" : "Generate temporary password"}</button>
        </div>
      ) : (
        <>
          <div style={{ background: "#ecfdf5", border: "1px solid #10b981", padding: "1rem", borderRadius: "var(--border-radius-sm)", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Temporary password generated</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>Share this with {result.email}. Expires {formatDate(result.expiresAt)}.</div>
          </div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Temporary Password</label>
          <input readOnly value={result.temporaryPassword} style={{ width: "100%", padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.9rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem", marginBottom: "0.75rem" }} onFocus={(e) => e.currentTarget.select()} />
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Reset URL</label>
          <input readOnly value={result.resetUrl} style={{ width: "100%", padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.85rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem", marginBottom: "0.75rem" }} onFocus={(e) => e.currentTarget.select()} />
          <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Token</label>
          <input readOnly value={result.resetToken} style={{ width: "100%", padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.85rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem", marginBottom: "1rem" }} onFocus={(e) => e.currentTarget.select()} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button onClick={() => { void navigator.clipboard?.writeText(result.temporaryPassword); }} className="btn btn-outline">Copy password</button>
            <button onClick={() => { void navigator.clipboard?.writeText(result.resetUrl); }} className="btn btn-outline">Copy link</button>
            <button onClick={onClose} className="btn btn-primary">Done</button>
          </div>
        </>
      )}
    </>
  );
};

const ScheduleReportModal = ({ onClose, onSubmit }: { onClose: () => void; onSubmit: (freq: string) => void }): JSX.Element => {
  const [freq, setFreq] = useState("Weekly");
  return (
    <>
      <ModalTitle>Schedule Report</ModalTitle>
      <p style={{ color: "var(--text-light)", marginBottom: "1rem" }}>Select a cadence. Reports will be emailed automatically.</p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {["Daily", "Weekly", "Monthly"].map(f => (
          <button
            key={f}
            onClick={() => setFreq(f)}
            className={freq === f ? "btn btn-primary" : "btn btn-outline"}
            style={{ flex: 1, padding: "0.6rem" }}
          >
            {f}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline">Cancel</button>
        <button onClick={() => onSubmit(freq)} className="btn btn-primary">Schedule {freq.toLowerCase()}</button>
      </div>
    </>
  );
};

const CreateCategoryModal = ({ title, busy, error, onClose, onSubmit }: { title: string; busy: boolean; error: string; onClose: () => void; onSubmit: (name: string) => Promise<void> }): JSX.Element => {
  const [name, setName] = useState("");
  return (
    <>
      <ModalTitle>{title}</ModalTitle>
      <ErrorBanner error={error} />
      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem", marginBottom: "1rem" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
        <button onClick={() => onSubmit(name.trim())} className="btn btn-primary" disabled={busy || name.trim().length < 2}>{busy ? "Saving…" : "Create"}</button>
      </div>
    </>
  );
};

const CreateBannerModal = ({ busy, error, onClose, onSubmit }: { busy: boolean; error: string; onClose: () => void; onSubmit: (p: { title: string; imageUrl: string; ctaText?: string; ctaUrl?: string }) => Promise<void> }): JSX.Element => {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const canSave = title.trim().length >= 2 && /^https?:\/\//.test(imageUrl);
  return (
    <>
      <ModalTitle>Create Banner</ModalTitle>
      <ErrorBanner error={error} />
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem" }} />
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Image URL
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem" }} />
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>CTA text (optional)
          <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem" }} />
        </label>
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>CTA URL (optional)
          <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "var(--border-radius-sm)", border: "1px solid #d1d5db", marginTop: "0.25rem" }} />
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button onClick={onClose} className="btn btn-outline" disabled={busy}>Cancel</button>
        <button
          onClick={() => onSubmit({ title: title.trim(), imageUrl: imageUrl.trim(), ctaText: ctaText.trim() || undefined, ctaUrl: ctaUrl.trim() || undefined })}
          className="btn btn-primary"
          disabled={busy || !canSave}
        >
          {busy ? "Saving…" : "Create"}
        </button>
      </div>
    </>
  );
};
