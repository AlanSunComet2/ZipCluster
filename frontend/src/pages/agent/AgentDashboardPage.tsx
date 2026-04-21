import { useEffect, useMemo, useState } from "react";
import { createAgentApi } from "../../api/agent";
import { useApiClient } from "../../auth/useApiClient";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import type { ListingSummary } from "../../api/contracts";
import { Link } from "react-router-dom";

type Section = "overview" | "listings" | "create" | "inquiries" | "profile" | "edit" | "public-profile";

export const AgentDashboardPage = (): JSX.Element => {
  const client = useApiClient();
  const agentApi = useMemo(() => createAgentApi(client), [client]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("overview");

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    contactEmail: "",
    phoneNumber: "",
    licenseNumber: "",
    licenseExpirationDate: "",
    licenseUrl: ""
  });

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [inquiries, setInquiries] = useState<Array<{ id: string; message: string; status: string }>>([]);
  const [tourRequests, setTourRequests] = useState<Array<{ id: string; status: string; preferredTime: string }>>([]);
  const [verification, setVerification] = useState<{ status: string; applicationStatus: string } | null>(null);
  // Public Profile form state
  const [publicProfileForm, setPublicProfileForm] = useState({
    bio: "", profilePictureUrl: "", contactEmail: "", phoneNumber: ""
  });

  // Profile form
  const [docUrl, setDocUrl] = useState("");

  // Create listing form
  const [newListing, setNewListing] = useState({ price: "", location: "", propertyType: "House", description: "", mediaUrls: "",bedrooms: "", bathrooms: "", squareFeet: "" });

  // Edit listing form (NEW)
  const [editListing, setEditListing] = useState<any>(null);

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
      
      // PRE-FILL THE PROFILE FORM
      if (verRes.user) {
       setProfileForm({
          fullName: "",
          email: verRes.user.email || "", // Keep the login email populated for the locked field
          contactEmail: "",
          phoneNumber: "",
          licenseNumber: "",
          licenseExpirationDate: "",
          licenseUrl: ""
        });

        // Add this to pre-fill the Public Profile tab:
        setPublicProfileForm({
          bio: verRes.user.bio || "",
          profilePictureUrl: verRes.user.profilePictureUrl || "",
          contactEmail: verRes.user.contactEmail || "",
          phoneNumber: verRes.user.phoneNumber || ""
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, [agentApi]);

  // NEW
  const updatePublicProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await agentApi.updatePublicProfile({
        bio: publicProfileForm.bio,
        profilePictureUrl: publicProfileForm.profilePictureUrl,
        contactEmail: publicProfileForm.contactEmail,
        phoneNumber: publicProfileForm.phoneNumber
      });
      flash("✓ Public profile updated successfully!");
      void loadAll();
    } catch {
      flash("✗ Failed to update public profile. Ensure URLs and Emails are valid.");
    }
  };

  // NEW
  const createListing = async (e: React.FormEvent, statusToSave: "DRAFT" | "PENDING") => {
    e.preventDefault();
    try {
      await agentApi.createListing({
        price: Number(newListing.price),
        location: newListing.location,
        propertyType: newListing.propertyType,
        description: newListing.description,
        bedrooms: newListing.bedrooms ? Number(newListing.bedrooms) : undefined,
        bathrooms: newListing.bathrooms ? Number(newListing.bathrooms) : undefined,
        squareFeet: newListing.squareFeet ? Number(newListing.squareFeet) : undefined,
        status: statusToSave,
        mediaUrls: newListing.mediaUrls.split(",").map(u => u.trim()).filter(Boolean),
      });
      setNewListing({ price: "", location: "", propertyType: "House", description: "", mediaUrls: "", bedrooms: "", bathrooms: "", squareFeet: "" });
      
      flash(statusToSave === "DRAFT" ? "✓ Draft saved successfully." : "✓ Listing submitted for admin review.");
      setActiveSection("listings");
      void loadAll();
    } catch { flash("✗ Failed to create listing."); }
  };

  const startEditing = (listing: any) => {
    setEditListing({
      id: listing.id,
      price: listing.price.toString(),
      location: listing.location,
      propertyType: listing.propertyType || "House",
      description: listing.description || "",
      bedrooms: listing.bedrooms?.toString() || "",
      bathrooms: listing.bathrooms?.toString() || "",
      squareFeet: listing.squareFeet?.toString() || "",
      mediaUrls: listing.mediaUrls?.join(", ") || "",
      status: listing.status
    });
    setActiveSection("edit");
  };

  const submitEdit = async (e: React.FormEvent, statusToSave?: "DRAFT" | "PENDING") => {
    e.preventDefault();
    if (!editListing) return;
    
    try {
      const payload: any = {
        price: Number(editListing.price),
        location: editListing.location,
        propertyType: editListing.propertyType,
        description: editListing.description,
        bedrooms: editListing.bedrooms ? Number(editListing.bedrooms) : undefined,
        bathrooms: editListing.bathrooms ? Number(editListing.bathrooms) : undefined,
        squareFeet: editListing.squareFeet ? Number(editListing.squareFeet) : undefined,
        mediaUrls: editListing.mediaUrls.split(",").map((u: string) => u.trim()).filter(Boolean),
      };
      
      // If the user explicitly clicked "Save as Draft" or "Submit for Review"
      if (statusToSave) {
        payload.status = statusToSave;
      }

      await agentApi.updateListing(editListing.id, payload);
      
      setEditListing(null);
      flash("✓ Listing updated successfully. (Major edits may require re-approval)");
      setActiveSection("listings");
      void loadAll();
    } catch { 
      flash("✗ Failed to update listing."); 
    }
  };

  const markSold = async (listing: ListingSummary) => {
    await agentApi.updateListing(listing.id, { status: "SOLD" });
    flash("✓ Listing marked as sold.");
    void loadAll();
  };

  const markUnsold = async (listing: ListingSummary) => {
    await agentApi.updateListing(listing.id, { status: "PENDING" });
    flash("✓ Listing marked as unsold.");
    void loadAll();
  };

  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await agentApi.deleteListing(id);
    flash("✓ Listing deleted.");
    void loadAll();
  };

  const respondInquiry = async (id: string) => {
    const text = inquiryResponses[id]?.trim();
    if (!text) return;
    await agentApi.respondToInquiry(id, text);
    setInquiryResponses(prev => ({ ...prev, [id]: "" }));
    flash("✓ Response sent.");
    void loadAll();
  };

  const resolveInquiry = async (id: string, status: "ANSWERED" | "RESOLVED") => {
    await agentApi.resolveInquiry(id, status);
    flash(`✓ Inquiry marked as ${status.toLowerCase()}.`);
    void loadAll();
  };

  const confirmTour = async (id: string) => {
    await agentApi.updateTourRequest(id, "CONFIRMED");
    flash("✓ Tour confirmed.");
    void loadAll();
  };

  const updateProfileSubmit = async (e: React.FormEvent) => {
  const declineTour = async (id: string) => {
    await agentApi.updateTourRequest(id, "DECLINED");
    flash("✓ Tour declined.");
    void loadAll();
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await agentApi.updateProfile({
        fullName: profileForm.fullName,
        contactEmail: profileForm.contactEmail,
        phoneNumber: profileForm.phoneNumber,
        licenseNumber: profileForm.licenseNumber,
        licenseExpirationDate: profileForm.licenseExpirationDate ? new Date(profileForm.licenseExpirationDate).toISOString() : undefined,
        licenseUrl: profileForm.licenseUrl
      });
      flash("Profile updated and license submitted for review!");
      void loadAll();
    } catch { 
      flash("Failed to update profile. Please ensure all fields are correct."); 
    }
  };

  // Parse contact details out of the structured message the user submitted
  const parseInquiryMeta = (message: string) => {
    const match = message.match(/^From: (.+?) \| Phone: (.+?) \| Email: (.+?)\n\n([\s\S]*)$/);
    if (match) return { name: match[1], phone: match[2], email: match[3], body: match[4] };
    return { name: null, phone: null, email: null, body: message };
  };

  // Parse user info from tour request notes if present
  const parseTourMeta = (tour: { id: string; status: string; preferredTime: string }) => {
    const date = new Date(tour.preferredTime);
    return {
      date: date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
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
    { key: "profile", label: "Verification", icon: "bi-shield-check" },
    { key: "public-profile", label: "Update Profile", icon: "bi-person-badge" }, // <-- New Item
    { key: "inquiries", label: "Inquiries", icon: "bi-chat-left-dots", badge: (inquiries.length + tourRequests.length) },
    { key: "profile", label: "Verification", icon: "bi-person-badge" },
  ];

  const status = verification?.status?.toUpperCase();

  const toggleSold = (listing: ListingSummary) => {
    if (listing.status === "PENDING") return;

    if (listing.status === "SOLD") {
      markUnsold(listing);
    } else {
      markSold(listing);
    }
  };

  // NEW
  const submitDraft = async (listing: ListingSummary) => {
    try {
      await agentApi.updateListing(listing.id, { status: "PENDING" });
      flash("✓ Draft submitted for admin review.");
      void loadAll();
    } catch {
      flash("✗ Failed to submit draft.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>

        {/* Sidebar */}
        <nav style={{ width: "220px", background: "white", borderRight: "1px solid rgba(0,0,0,0.06)", padding: "2rem 1rem", flexShrink: 0 }}>
          <div style={{ marginBottom: "1.5rem", padding: "0 0.5rem" }}>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>Agent Portal</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>facilitates buying, selling, or renting of property</div>
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
                  { label: "Messages & Tour Requests", value: stats.messages, icon: "bi-chat-dots", color: "var(--secondary-color)" },
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
                          {/* Distinct styling applied to DRAFT status */}
                          <span 
                            className={`badge ${listing.status === "APPROVED" ? "badge-success" : listing.status === "PENDING" ? "badge-warning" : "badge-danger"}`}
                            style={listing.status === "DRAFT" ? { background: "#ef4444", color: "#white" } : {}}
                          >
                            {listing.status}
                          </span>
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          
                          {/* If DRAFT: Show Submit Button */}
                          {listing.status === "DRAFT" && (
                            <button
                              onClick={() => submitDraft(listing)}
                              className="btn btn-primary"
                              style={{
                                padding: "0.3rem 0.8rem",
                                fontSize: "0.8rem",
                                marginRight: "0.5rem"
                              }}
                            >
                              Submit for Review
                            </button>
                          )}

                          {/* If APPROVED or SOLD: Show Mark Sold/Unsold */}
                          {(listing.status === "APPROVED" || listing.status === "SOLD") && (
                            <button
                              onClick={() => toggleSold(listing)}
                              className="btn btn-outline"
                              style={{
                                padding: "0.3rem 0.8rem",
                                fontSize: "0.8rem",
                                marginRight: "0.5rem"
                              }}
                            >
                              {listing.status === "SOLD" ? "Mark Unsold" : "Mark Sold"}
                            </button>
                          )}

                          {/* ALWAYS SHOW: Edit Button NEW */}
                          <button
                            onClick={() => startEditing(listing)}
                            className="btn btn-outline"
                            style={{
                              padding: "0.3rem 0.8rem",
                              fontSize: "0.8rem",
                              marginRight: "0.5rem",
                              color: "var(--primary-color)",
                              borderColor: "var(--primary-color)"
                            }}
                          >
                            Edit
                          </button>

                          {/* ALWAYS SHOW: Delete Button */}
                          <button
                            onClick={() => deleteListing(listing.id)}
                            className="btn btn-outline"
                            style={{
                              padding: "0.3rem 0.8rem",
                              fontSize: "0.8rem",
                              color: "var(--danger,#ef4444)",
                              borderColor: "var(--danger,#ef4444)"
                            }}
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

          {/* CREATE LISTING */}
          {/* CREATE LISTING */}
          {activeSection === "create" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Create New Listing</h1>
              <div className="card" style={{ padding: "2rem", maxWidth: "800px" }}>
                {/* Notice we removed onSubmit from the form tag and moved it to the buttons */}
                <form>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                    <div className="form-group">
                      <label className="form-label text-muted">Location / Address *</label>
                      <input className="form-control" required placeholder="123 Main St, Austin, TX"
                        value={newListing.location} onChange={e => setNewListing(n => ({ ...n, location: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Price (USD) *</label>
                      <input className="form-control" type="number" required min="1" placeholder="500000"
                        value={newListing.price} onChange={e => setNewListing(n => ({ ...n, price: e.target.value }))} />
                    </div>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                    <div className="form-group">
                      <label className="form-label text-muted">Property Type</label>
                      <select className="form-control" value={newListing.propertyType} onChange={e => setNewListing(n => ({ ...n, propertyType: e.target.value }))}>
                        {["House", "Condo", "Townhouse", "Land"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Bedrooms</label>
                      <input className="form-control" type="number" min="0" placeholder="e.g. 3"
                        value={newListing.bedrooms} onChange={e => setNewListing(n => ({ ...n, bedrooms: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Bathrooms</label>
                      <input className="form-control" type="number" step="0.5" min="0" placeholder="e.g. 2.5"
                        value={newListing.bathrooms} onChange={e => setNewListing(n => ({ ...n, bathrooms: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Square Feet</label>
                      <input className="form-control" type="number" min="0" placeholder="e.g. 2000"
                        value={newListing.squareFeet} onChange={e => setNewListing(n => ({ ...n, squareFeet: e.target.value }))} />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                    <label className="form-label text-muted">Description *</label>
                    <textarea className="form-control" required rows={5} placeholder="Describe the property..."
                      value={newListing.description} onChange={e => setNewListing(n => ({ ...n, description: e.target.value }))}></textarea>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: "2rem" }}>
                    <label className="form-label text-muted">Media URLs (Upload multiple by separating with commas)</label>
                    <textarea className="form-control" rows={2} placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                      value={newListing.mediaUrls} onChange={e => setNewListing(n => ({ ...n, mediaUrls: e.target.value }))}></textarea>
                    <small className="text-muted" style={{ display: "block", marginTop: "0.5rem" }}>Please separate multiple image links with a comma.</small>
                  </div>

                  <div style={{ display: "flex", gap: "1rem", borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
                    <button type="button" className="btn btn-outline" onClick={(e) => createListing(e, "DRAFT")}>
                      <i className="bi bi-save me-1"></i> Save as Draft
                    </button>
                    <button type="button" className="btn btn-primary" onClick={(e) => createListing(e, "PENDING")}>
                      <i className="bi bi-send me-1"></i> Submit for Review
                    </button>
                    <button type="button" className="btn btn-outline" style={{ marginLeft: "auto", border: "none" }} onClick={() => setActiveSection("listings")}>Cancel</button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* EDIT LISTING NEW */}
          {activeSection === "edit" && editListing && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Edit Property Listing</h1>
              <div className="card" style={{ padding: "2rem", maxWidth: "800px" }}>
                
                {editListing.status === "APPROVED" && (
                  <div style={{ borderLeft: "4px solid var(--warning)", paddingLeft: "1rem", marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    <strong>Note:</strong> This listing is currently Live. Making major changes to the Price, Location, or Media will temporarily hide the listing until an Admin re-approves it.
                  </div>
                )}

                <form>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                    <div className="form-group">
                      <label className="form-label text-muted">Location / Address *</label>
                      <input className="form-control" required placeholder="123 Main St, Austin, TX"
                        value={editListing.location} onChange={e => setEditListing((n: any) => ({ ...n, location: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Price (USD) *</label>
                      <input className="form-control" type="number" required min="1" placeholder="500000"
                        value={editListing.price} onChange={e => setEditListing((n: any) => ({ ...n, price: e.target.value }))} />
                    </div>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                    <div className="form-group">
                      <label className="form-label text-muted">Property Type</label>
                      <select className="form-control" value={editListing.propertyType} onChange={e => setEditListing((n: any) => ({ ...n, propertyType: e.target.value }))}>
                        {["House", "Condo", "Townhouse", "Land"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Bedrooms</label>
                      <input className="form-control" type="number" min="0" placeholder="e.g. 3"
                        value={editListing.bedrooms} onChange={e => setEditListing((n: any) => ({ ...n, bedrooms: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Bathrooms</label>
                      <input className="form-control" type="number" step="0.5" min="0" placeholder="e.g. 2.5"
                        value={editListing.bathrooms} onChange={e => setEditListing((n: any) => ({ ...n, bathrooms: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Square Feet</label>
                      <input className="form-control" type="number" min="0" placeholder="e.g. 2000"
                        value={editListing.squareFeet} onChange={e => setEditListing((n: any) => ({ ...n, squareFeet: e.target.value }))} />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                    <label className="form-label text-muted">Description *</label>
                    <textarea className="form-control" required rows={5} placeholder="Describe the property..."
                      value={editListing.description} onChange={e => setEditListing((n: any) => ({ ...n, description: e.target.value }))}></textarea>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: "2rem" }}>
                    <label className="form-label text-muted">Media URLs (Upload multiple by separating with commas)</label>
                    <textarea className="form-control" rows={2} placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                      value={editListing.mediaUrls} onChange={e => setEditListing((n: any) => ({ ...n, mediaUrls: e.target.value }))}></textarea>
                  </div>

                  <div style={{ display: "flex", gap: "1rem", borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
                    
                    {/* Show Draft options if it's currently a Draft */}
                    {editListing.status === "DRAFT" ? (
                      <>
                        <button type="button" className="btn btn-outline" onClick={(e) => submitEdit(e, "DRAFT")}>
                          <i className="bi bi-save me-1"></i> Save Draft Updates
                        </button>
                        <button type="button" className="btn btn-primary" onClick={(e) => submitEdit(e, "PENDING")}>
                          <i className="bi bi-send me-1"></i> Submit for Review
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn btn-primary" onClick={(e) => submitEdit(e)}>
                        <i className="bi bi-check2-circle me-1"></i> Save Changes
                      </button>
                    )}

                    <button type="button" className="btn btn-outline" style={{ marginLeft: "auto", border: "none" }} onClick={() => { setEditListing(null); setActiveSection("listings"); }}>Cancel</button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* INQUIRIES & TOURS */}
          {activeSection === "inquiries" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Inquiries & Tour Requests</h1>

              {/* MESSAGES */}
              <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>
                Messages
                <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-light)", marginLeft: "0.75rem" }}>
                  {inquiries.filter(i => i.status === "OPEN").length} open
                </span>
              </h3>
              <div className="card" style={{ marginBottom: "2.5rem" }}>
                {inquiries.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>
                    <i className="bi bi-chat-left" style={{ fontSize: "2rem", display: "block", marginBottom: "0.75rem" }}></i>
                    No inquiries yet.
                  </div>
                ) : inquiries.map(inq => {
                  const meta = parseInquiryMeta(inq.message);
                  return (
                    <div key={inq.id} style={{ padding: "1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>

                      {/* Sender info row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "1rem", flexShrink: 0 }}>
                            {(meta.name ?? inq.message)[0].toUpperCase()}
                          </div>
                          <div>
                            {meta.name && <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{meta.name}</div>}
                            <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "var(--text-light)", marginTop: "0.1rem" }}>
                              {meta.email && <span><i className="bi bi-envelope me-1" style={{ marginRight: "0.25rem"}}></i>{meta.email}</span>}
                              {meta.phone && <span><i className="bi bi-telephone me-1" style={{ marginRight: "0.25rem"}}></i>{meta.phone}</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`badge ${inq.status === "RESOLVED" ? "badge-success" : inq.status === "ANSWERED" ? "badge-warning" : ""}`}>
                          {inq.status}
                        </span>
                      </div>

                      {/* Message body */}
                      <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--border-radius-sm)", padding: "0.9rem 1rem", marginBottom: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        {meta.body}
                      </div>

                      {/* Reply input */}
                      {inq.status !== "RESOLVED" && (
                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <input className="form-control" placeholder="Write a reply..." style={{ flex: 1 }}
                          value={inquiryResponses[inq.id] || ""}
                          onChange={e => setInquiryResponses(prev => ({ ...prev, [inq.id]: e.target.value }))} />
                        <button className="btn btn-primary" onClick={() => respondInquiry(inq.id)} style={{ flexShrink: 0 }}>
                          <i className="bi bi-send me-1"></i>Reply
                        </button>
                      </div>
                      )}

                      {/* Status buttons */}
                      {inq.status !== "RESOLVED" && (
                        <>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn btn-outline" onClick={() => resolveInquiry(inq.id, "ANSWERED")}
                              style={{ fontSize: "0.8rem", padding: "0.3rem 0.9rem" }}>
                              <i className="bi bi-check me-1"></i>Mark Answered
                            </button>
                            <button className="btn btn-outline" onClick={() => resolveInquiry(inq.id, "RESOLVED")}
                              disabled={inq.status === "RESOLVED"}
                              style={{ fontSize: "0.8rem", padding: "0.3rem 0.9rem", color: "var(--success)", borderColor: "var(--success)" }}>
                              <i className="bi bi-check-all me-1"></i>Resolve
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* TOUR REQUESTS */}
              <h3 style={{ fontWeight: 700, marginBottom: "1rem" }}>
                Tour Requests
                <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-light)", marginLeft: "0.75rem" }}>
                  {tourRequests.filter(t => t.status === "REQUESTED").length} pending
                </span>
              </h3>
              <div className="card">
                {tourRequests.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-light)" }}>
                    <i className="bi bi-calendar-x" style={{ fontSize: "2rem", display: "block", marginBottom: "0.75rem" }}></i>
                    No tour requests yet.
                  </div>
                ) : tourRequests.map(tour => {
                  const { date, time } = parseTourMeta(tour);
                  return (
                    <div key={tour.id} style={{ padding: "1.5rem", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "var(--border-radius-sm)", background: "var(--bg-secondary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="bi bi-calendar3" style={{ color: "var(--primary-color)", fontSize: "1.2rem" }}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{date}</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
                            <i className="bi bi-clock me-1"></i>{time}
                          </div>
                          <span className={`badge mt-1 ${tour.status === "CONFIRMED" ? "badge-success" : tour.status === "DECLINED" ? "badge-danger" : "badge-warning"}`}>
                            {tour.status}
                          </span>
                        </div>
                      </div>
                      {tour.status === "REQUESTED" && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => confirmTour(tour.id)} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
                            <i className="bi bi-calendar-check me-1"></i>Confirm
                          </button>
                          <button onClick={() => declineTour(tour.id)} className="btn btn-outline" style={{ fontSize: "0.85rem", color: "var(--danger,#ef4444)", borderColor: "var(--danger,#ef4444)" }}>
                            <i className="bi bi-x me-1"></i>Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* VERIFICATION */}
          {/* VERIFICATION */}
          {activeSection === "profile" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Verifying Profile and License</h1>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                
                {/* Status Tracker */}
                <div className="card" style={{ flex: 1, minWidth: "280px", padding: "2rem" }}>
                  <h4 style={{ fontWeight: 800, marginBottom: "1.5rem" }}>Current Status</h4>
                  <div style={{ background: "var(--bg-primary)", borderRadius: "8px", padding: "1.5rem", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-light)", marginBottom: "0.5rem" }}>Agent Role</div>
                    <span className={`badge ${status === "APPROVED" || status === "VERIFIED" ? "badge-success" : "badge-warning"}`}>
                      {verification?.status || "PENDING"}
                    </span>
                  </div>
                  <div style={{ background: "var(--bg-primary)", borderRadius: "8px", padding: "1.5rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-light)", marginBottom: "0.5rem" }}>Application</div>
                    <div style={{ fontWeight: 700 }}>{verification?.applicationStatus || "NOT SUBMITTED"}</div>
                  </div>
                </div>

                {/* Profile Update Form */}
                <div className="card" style={{ flex: 2, minWidth: "320px", padding: "2rem" }}>
                  <h4 style={{ fontWeight: 800, marginBottom: "1rem" }}>Required Information</h4>
                  
                  {/* Dynamic Status Message */}
                  {status === "APPROVED" || status === "VERIFIED" ? (
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--success)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "var(--success)", fontSize: "0.95rem", fontWeight: 600 }}>
                      <i className="bi bi-check-circle-fill me-2"></i> Agent profile verification is complete.
                    </div>
                  ) : (
                    <div style={{ borderLeft: "4px solid var(--warning)", paddingLeft: "1rem", marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      Updating your profile will require an Admin to re-verify your license before your listings go live.
                    </div>
                  )}
                  
                  <form onSubmit={updateProfileSubmit}>
                    
                      <div className="form-group">
                        <label className="form-label text-muted">Full Name</label>
                        <input type="text" className="form-control" value={profileForm.fullName} onChange={e => setProfileForm(p => ({...p, fullName: e.target.value}))} readOnly={status === "APPROVED" || status === "VERIFIED"} style={status === "APPROVED" || status === "VERIFIED" ? { background: "#f8f9fa" } : {}} />
                      </div>
                    

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div className="form-group">
                        <label className="form-label text-muted">Contact Email {(status !== "APPROVED" && status !== "VERIFIED") && "*"}</label>
                        <input type="email" required={status !== "APPROVED" && status !== "VERIFIED"} className="form-control" value={profileForm.contactEmail} onChange={e => setProfileForm(p => ({...p, contactEmail: e.target.value}))} readOnly={status === "APPROVED" || status === "VERIFIED"} style={status === "APPROVED" || status === "VERIFIED" ? { background: "#f8f9fa" } : {}} />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-muted">Phone Number</label>
                        <input type="tel" className="form-control" value={profileForm.phoneNumber} onChange={e => setProfileForm(p => ({...p, phoneNumber: e.target.value}))} readOnly={status === "APPROVED" || status === "VERIFIED"} style={status === "APPROVED" || status === "VERIFIED" ? { background: "#f8f9fa" } : {}} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                      <div className="form-group">
                        <label className="form-label text-muted">License Number {(status !== "APPROVED" && status !== "VERIFIED") && "*"}</label>
                        <input type="text" className="form-control" required={status !== "APPROVED" && status !== "VERIFIED"} value={profileForm.licenseNumber} onChange={e => setProfileForm(p => ({...p, licenseNumber: e.target.value}))} readOnly={status === "APPROVED" || status === "VERIFIED"} style={status === "APPROVED" || status === "VERIFIED" ? { background: "#f8f9fa" } : {}} />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-muted">Expiration Date</label>
                        <input type="date" className="form-control" value={profileForm.licenseExpirationDate} onChange={e => setProfileForm(p => ({...p, licenseExpirationDate: e.target.value}))} readOnly={status === "APPROVED" || status === "VERIFIED"} style={status === "APPROVED" || status === "VERIFIED" ? { background: "#f8f9fa" } : {}} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                      <label className="form-label text-muted">License Document URL {(status !== "APPROVED" && status !== "VERIFIED") && "*"}</label>
                      <input type="url" className="form-control" required={status !== "APPROVED" && status !== "VERIFIED"} value={profileForm.licenseUrl} onChange={e => setProfileForm(p => ({...p, licenseUrl: e.target.value}))} placeholder="https://example.com/license.jpg" readOnly={status === "APPROVED" || status === "VERIFIED"} style={status === "APPROVED" || status === "VERIFIED" ? { background: "#f8f9fa" } : {}} />
                    </div>

                    {/* Only show submit button if NOT approved */}
                    {status !== "APPROVED" && status !== "VERIFIED" && (
                      <button type="submit" className="btn btn-primary" disabled={verification?.applicationStatus === "PENDING"}>
                        {verification?.applicationStatus === "PENDING" ? "Application Under Review" : "Save Profile & Submit License"}
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </>
          )}

          {/* PUBLIC PROFILE UPDATE */}
          {activeSection === "public-profile" && (
            <>
              <h1 style={{ fontWeight: 800, marginBottom: "2rem" }}>Update Public Profile</h1>
              <div className="card" style={{ padding: "2rem", maxWidth: "800px" }}>
                <div style={{ borderLeft: "4px solid var(--primary-color)", paddingLeft: "1rem", marginBottom: "1.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  This information will be displayed on your public agent profile for buyers to see. Updating this does NOT affect your verification status.
                </div>
                <form onSubmit={updatePublicProfileSubmit}>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label text-muted">Contact Email *</label>
                      <input type="email" required className="form-control" value={publicProfileForm.contactEmail} onChange={e => setPublicProfileForm(p => ({...p, contactEmail: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label text-muted">Phone Number *</label>
                      <input type="tel" required className="form-control" value={publicProfileForm.phoneNumber} onChange={e => setPublicProfileForm(p => ({...p, phoneNumber: e.target.value}))} />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                    <label className="form-label text-muted">Profile Picture URL</label>
                    <input type="url" className="form-control" value={publicProfileForm.profilePictureUrl} onChange={e => setPublicProfileForm(p => ({...p, profilePictureUrl: e.target.value}))} placeholder="https://example.com/my-photo.jpg" />
                  </div>

                  <div className="form-group" style={{ marginBottom: "2rem" }}>
                    <label className="form-label text-muted">Bio / About Me</label>
                    <textarea className="form-control" rows={6} value={publicProfileForm.bio} onChange={e => setPublicProfileForm(p => ({...p, bio: e.target.value}))} placeholder="Tell buyers about your experience, specialties, and service areas..."></textarea>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-save me-2"></i> Save Public Profile
                  </button>

                </form>
              </div>
            </>
          )}

        </main>
      </div>
      <Footer />
    </div>
  );
};
