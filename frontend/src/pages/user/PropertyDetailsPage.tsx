import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { ListingSummary } from "../../api/contracts";
import { createEngagementApi } from "../../api/engagement";
import { createListingsApi } from "../../api/listings";
import { useAuth } from "../../auth/AuthProvider";
import { useApiClient } from "../../auth/useApiClient";
import { ApiClient } from "../../api/client";
import { env } from "../../config/env";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";

type Modal = "none" | "tour" | "contact" | "image";

interface AgentInfo {
  id: string;
  email: string;
  memberSince: string;
  avgRating: number | null;
  totalReviews: number;
  recentReviews: Array<{ rating: number; reviewerEmail: string; createdAt: string }>;
}

const StarRating = ({ value, size = "0.9rem" }: { value: number; size?: string }) => (
  <span style={{ display: "inline-flex", gap: "0.15rem" }}>
    {[1, 2, 3, 4, 5].map(s => (
      <i key={s} className={`bi ${value >= s ? "bi-star-fill" : value >= s - 0.5 ? "bi-star-half" : "bi-star"}`}
        style={{ fontSize: size, color: value >= s - 0.4 ? "#f59e0b" : "var(--text-light)" }} />
    ))}
  </span>
);

export const PropertyDetailsPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const authClient = useApiClient();
  const publicClient = useMemo(() => new ApiClient({ baseUrl: env.apiBaseUrl }), []);
  const listingsApi = useMemo(() => createListingsApi(publicClient), [publicClient]);
  const engagementApi = useMemo(() => createEngagementApi(authClient), [authClient]);

  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [modal, setModal] = useState<Modal>("none");
  const [copied, setCopied] = useState(false);

  const [tourForm, setTourForm] = useState({ firstName: "", lastName: "", email: "", phone: "", date: "", time: "", notes: "", sendCopy: false });
  const [tourStatus, setTourStatus] = useState("");
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "", sendCopy: false });
  const [contactStatus, setContactStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      listingsApi.getPublicListing(id),
      listingsApi.getListingAgent(id).catch(() => null),
    ]).then(([l, a]) => {
      setListing(l);
      setAgentInfo(a);
    }).catch(() => setListing(null))
      .finally(() => setLoading(false));

    if (session) {
      engagementApi.listFavorites().then(res => {
        setIsSaved(res.items.some(f => f.listingId === id));
      }).catch(() => {});
    }
  }, [id, session]);

  const toggleSave = async () => {
    if (!session) return alert("Please log in to save properties");
    if (!id) return;
    try {
      if (isSaved) { await engagementApi.removeFavorite(id); setIsSaved(false); }
      else { await engagementApi.addFavorite(id); setIsSaved(true); }
    } catch {}
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) { await navigator.share({ title: listing?.location ?? "Property", url }); }
    else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTourSubmit = async () => {
    if (!session) return alert("Please log in to schedule a tour");
    if (!id) return;
    const { firstName, lastName, email, phone, date, time } = tourForm;
    if (!firstName || !lastName || !email || !phone || !date || !time) {
      setTourStatus("Please fill in all required fields."); return;
    }
    try {
      await engagementApi.createTourRequest(id, new Date(`${date}T${time}`).toISOString());
      setTourStatus("✓ Tour request sent! The agent will confirm your appointment.");
      setTourForm({ firstName: "", lastName: "", email: "", phone: "", date: "", time: "", notes: "", sendCopy: false });
    } catch { setTourStatus("✗ Failed to submit tour request. Please try again."); }
  };

  const handleContactSubmit = async () => {
    if (!session) return alert("Please log in to contact the agent");
    if (!id) return;
    const { firstName, lastName, email, phone, message } = contactForm;
    if (!firstName || !lastName || !email || !phone || !message.trim()) {
      setContactStatus("Please fill in all required fields."); return;
    }
    try {
      const fullMessage = `From: ${firstName} ${lastName} | Phone: ${phone} | Email: ${email}\n\n${message}`;
      await engagementApi.createInquiry(id, fullMessage);
      setContactStatus("✓ Message sent to agent!");
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", message: "", sendCopy: false });
    } catch { setContactStatus("✗ Failed to send message. Please try again."); }
  };

  const closeModal = () => { setModal("none"); setTourStatus(""); setContactStatus(""); };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-light)" }}>
        <div style={{ textAlign: "center" }}>
          <i className="bi bi-hourglass-split" style={{ fontSize: "2.5rem", display: "block", marginBottom: "1rem" }}></i>
          Loading property...
        </div>
      </div>
      <Footer />
    </div>
  );

  if (!listing) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "var(--text-light)" }}>
          <i className="bi bi-house-x" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}></i>
          <h2 style={{ fontWeight: 700 }}>Property not found</h2>
          <p>This listing may have been removed or is no longer available.</p>
        </div>
      </div>
      <Footer />
    </div>
  );

  const images = listing.mediaUrls?.length ? listing.mediaUrls : [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687931-cecebd808cbd?w=600&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80",
  ];
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const pricePerSqft = listing.squareFeet ? Math.round(listing.price / listing.squareFeet) : null;

  const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem 0.75rem", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "var(--border-radius-sm)", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--bg-secondary)" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-light)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" };
  const rowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" };

  return (
    <>
      <Navbar />
      {/* Hero image gallery */}
      <div style={{ background: "#0a0a0a", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "280px 280px", gap: "3px", maxHeight: "563px", overflow: "hidden" }}>
          {/* Main large image */}
          <div
            onClick={() => setModal("image")}
            style={{ gridRow: "1 / 3", position: "relative", cursor: "zoom-in", overflow: "hidden" }}
          >
            <img src={images[0]} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              alt="Main" />
          </div>
          {/* Secondary images */}
          {[1, 2].map((i) => (
            <div key={i} onClick={() => { setActiveImage(i); setModal("image"); }}
              style={{ position: "relative", cursor: "zoom-in", overflow: "hidden" }}>
              {images[i] ? (
                <img src={images[i]} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                  alt={`View ${i + 1}`} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#1a1a1a" }} />
              )}
              {i === 2 && images.length > 3 && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "1.1rem", gap: "0.5rem" }}>
                  <i className="bi bi-images"></i> +{images.length - 3} more
                </div>
              )}
            </div>
          ))}
        </div>
        {/* View all button */}
        <button onClick={() => setModal("image")}
          style={{ position: "absolute", bottom: "1.25rem", right: "1.25rem", background: "white", border: "none", borderRadius: "50px", padding: "0.5rem 1.25rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          <i className="bi bi-grid-3x3-gap"></i> View all {images.length} photos
        </button>
        {/* Save + Share overlays */}
        <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", display: "flex", gap: "0.5rem" }}>
          <button onClick={toggleSave}
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: "none", borderRadius: "50px", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <i className={`bi ${isSaved ? "bi-heart-fill" : "bi-heart"}`} style={{ color: isSaved ? "#ef4444" : "inherit" }}></i>
            {isSaved ? "Saved" : "Save"}
          </button>
          <button onClick={handleShare}
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", border: "none", borderRadius: "50px", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <i className={`bi ${copied ? "bi-check2" : "bi-share"}`}></i>
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      <main className="container" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* LEFT COLUMN */}
          <div style={{ flex: "1 1 560px", minWidth: 0 }}>

            {/* Title + price */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span className="badge badge-success">{listing.status}</span>
                {listing.propertyType && <span className="badge" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid rgba(0,0,0,0.1)" }}>{listing.propertyType}</span>}
              </div>
              <h1 style={{ fontWeight: 800, fontSize: "1.9rem", margin: "0 0 0.35rem", lineHeight: 1.2 }}>{listing.location}</h1>
              <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--primary-color)", lineHeight: 1 }}>
                  {formatter.format(listing.price)}
                </span>
                {pricePerSqft && (
                  <span style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                    {formatter.format(pricePerSqft)}/sqft
                  </span>
                )}
              </div>
            </div>

            {/* Key stats bar */}
            {(listing.bedrooms != null || listing.bathrooms != null || listing.squareFeet != null) && (
              <div style={{ display: "flex", gap: "0", marginBottom: "2rem", background: "var(--bg-secondary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
                {listing.bedrooms != null && (
                  <div style={{ flex: 1, padding: "1.25rem", textAlign: "center", borderRight: "1px solid rgba(0,0,0,0.06)" }}>
                    <i className="bi bi-door-open" style={{ fontSize: "1.4rem", color: "var(--primary-color)", display: "block", marginBottom: "0.3rem" }}></i>
                    <div style={{ fontWeight: 800, fontSize: "1.3rem" }}>{listing.bedrooms}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", fontWeight: 600, textTransform: "uppercase" }}>Beds</div>
                  </div>
                )}
                {listing.bathrooms != null && (
                  <div style={{ flex: 1, padding: "1.25rem", textAlign: "center", borderRight: listing.squareFeet != null ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                    <i className="bi bi-droplet" style={{ fontSize: "1.4rem", color: "var(--primary-color)", display: "block", marginBottom: "0.3rem" }}></i>
                    <div style={{ fontWeight: 800, fontSize: "1.3rem" }}>{listing.bathrooms}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", fontWeight: 600, textTransform: "uppercase" }}>Baths</div>
                  </div>
                )}
                {listing.squareFeet != null && (
                  <div style={{ flex: 1, padding: "1.25rem", textAlign: "center" }}>
                    <i className="bi bi-aspect-ratio" style={{ fontSize: "1.4rem", color: "var(--primary-color)", display: "block", marginBottom: "0.3rem" }}></i>
                    <div style={{ fontWeight: 800, fontSize: "1.3rem" }}>{listing.squareFeet.toLocaleString()}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", fontWeight: 600, textTransform: "uppercase" }}>Sq Ft</div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontWeight: 800, marginBottom: "1.25rem", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <i className="bi bi-house-heart" style={{ color: "var(--primary-color)" }}></i> About This Home
              </h3>
              <p style={{ fontSize: "1rem", lineHeight: "1.85", color: "var(--text-secondary)", whiteSpace: "pre-wrap", margin: 0 }}>
                {listing.description || "No description provided. Schedule a tour to discover its features in person."}
              </p>
            </div>

            {/* Property details grid */}
            <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontWeight: 800, marginBottom: "1.25rem", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <i className="bi bi-list-check" style={{ color: "var(--primary-color)" }}></i> Property Details
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
                {[
                  { label: "Property Type", value: listing.propertyType, icon: "bi-house-door" },
                  { label: "Status", value: listing.status, icon: "bi-check-circle" },
                  { label: "Bedrooms", value: listing.bedrooms != null ? `${listing.bedrooms} Bedrooms` : null, icon: "bi-door-open" },
                  { label: "Bathrooms", value: listing.bathrooms != null ? `${listing.bathrooms} Bathrooms` : null, icon: "bi-droplet" },
                  { label: "Square Footage", value: listing.squareFeet != null ? `${listing.squareFeet.toLocaleString()} sq ft` : null, icon: "bi-aspect-ratio" },
                  { label: "Price per Sq Ft", value: pricePerSqft ? `${formatter.format(pricePerSqft)}` : null, icon: "bi-calculator" },
                  { label: "Listed Price", value: formatter.format(listing.price), icon: "bi-tag" },
                  { label: "Location", value: listing.location, icon: "bi-geo-alt" },
                ].filter(d => d.value).map((detail, i, arr) => (
                  <div key={detail.label} style={{
                    padding: "1rem 0.75rem",
                    borderBottom: i < arr.length - 2 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    borderRight: i % 2 === 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.3rem" }}>
                      <i className={`bi ${detail.icon}`} style={{ marginRight: "0.35rem" }}></i>{detail.label}
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{detail.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent card */}
            {agentInfo && (
              <div className="card" style={{ padding: "2rem" }}>
                <h3 style={{ fontWeight: 800, marginBottom: "1.5rem", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <i className="bi bi-person-badge" style={{ color: "var(--primary-color)" }}></i> Listed By
                </h3>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
                  <div style={{
                    width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 800, fontSize: "1.5rem",
                  }}>
                    {agentInfo.email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.25rem" }}>{agentInfo.email}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                      <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>
                        <i className="bi bi-patch-check-fill me-1"></i>Verified Agent
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                        <i className="bi bi-calendar3" style={{ marginRight: "0.3rem" }}></i>
                        Member since {new Date(agentInfo.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </span>
                    </div>
                    {agentInfo.avgRating !== null ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <StarRating value={agentInfo.avgRating} size="1rem" />
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{agentInfo.avgRating.toFixed(1)}</span>
                        <span style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
                          ({agentInfo.totalReviews} {agentInfo.totalReviews === 1 ? "review" : "reviews"})
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>No reviews yet</span>
                    )}

                    {/* Recent reviews */}
                    {agentInfo.recentReviews.length > 0 && (
                      <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {agentInfo.recentReviews.map((r, i) => (
                          <div key={i} style={{ background: "var(--bg-primary)", borderRadius: "var(--border-radius-md)", padding: "0.85rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                                {r.reviewerEmail[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{r.reviewerEmail}</div>
                                <StarRating value={r.rating} size="0.75rem" />
                              </div>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>
                              {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Sticky sidebar */}
          <div style={{ flex: "0 0 340px", position: "sticky", top: "90px" }}>
            <div className="card" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--primary-color)" }}>{formatter.format(listing.price)}</div>
                {pricePerSqft && <div style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>{formatter.format(pricePerSqft)}/sqft</div>}
              </div>
              <button className="btn btn-primary w-100 mb-3" onClick={() => setModal("tour")} style={{ fontSize: "1rem", padding: "0.85rem" }}>
                <i className="bi bi-calendar-check me-2"></i>Schedule a Tour
              </button>
              <button className="btn btn-outline w-100 mb-3" onClick={() => setModal("contact")} style={{ fontSize: "1rem", padding: "0.85rem" }}>
                <i className="bi bi-chat-left-text me-2"></i>Contact Agent
              </button>
              <button onClick={handleShare} className="btn btn-outline w-100" style={{ padding: "0.75rem" }}>
                <i className={`bi ${copied ? "bi-check2" : "bi-share"} me-2`}></i>{copied ? "Link Copied!" : "Share Property"}
              </button>
            </div>

            {/* Quick facts card */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <h5 style={{ fontWeight: 800, marginBottom: "1rem", fontSize: "0.9rem", textTransform: "uppercase", color: "var(--text-light)", letterSpacing: "0.05em" }}>Quick Facts</h5>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {[
                  { icon: "bi-house-door", label: "Type", value: listing.propertyType || "—" },
                  { icon: "bi-door-open", label: "Bedrooms", value: listing.bedrooms != null ? `${listing.bedrooms} beds` : "—" },
                  { icon: "bi-droplet", label: "Bathrooms", value: listing.bathrooms != null ? `${listing.bathrooms} baths` : "—" },
                  { icon: "bi-aspect-ratio", label: "Size", value: listing.squareFeet != null ? `${listing.squareFeet.toLocaleString()} sqft` : "—" },
                  { icon: "bi-geo-alt", label: "Location", value: listing.location },
                ].map(f => (
                  <div key={f.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-light)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <i className={`bi ${f.icon}`}></i>{f.label}
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Full Image Modal */}
      {modal === "image" && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <button onClick={closeModal} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: "50%", width: "44px", height: "44px", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          {/* Prev/Next */}
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setActiveImage(i => (i - 1 + images.length) % images.length); }}
                style={{ position: "absolute", left: "1.5rem", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: "50%", width: "44px", height: "44px", fontSize: "1.3rem", cursor: "pointer" }}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <button onClick={e => { e.stopPropagation(); setActiveImage(i => (i + 1) % images.length); }}
                style={{ position: "absolute", right: "4.5rem", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: "50%", width: "44px", height: "44px", fontSize: "1.3rem", cursor: "pointer" }}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </>
          )}
          <img src={images[activeImage]} onClick={e => e.stopPropagation()} style={{ maxWidth: "88vw", maxHeight: "78vh", objectFit: "contain", borderRadius: "8px" }} alt="Full view" />
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: "0.75rem" }}>{activeImage + 1} / {images.length}</div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            {images.map((img, i) => (
              <img key={i} src={img} onClick={e => { e.stopPropagation(); setActiveImage(i); }}
                style={{ width: "60px", height: "44px", objectFit: "cover", borderRadius: "4px", cursor: "pointer", border: activeImage === i ? "2px solid white" : "2px solid transparent", opacity: activeImage === i ? 1 : 0.5, transition: "all 0.15s" }} alt="" />
            ))}
          </div>
        </div>
      )}

      {/* Tour Modal */}
      {modal === "tour" && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: "560px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={{ fontWeight: 800, margin: 0 }}>Schedule a Tour</h3>
              <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text-light)" }}>✕</button>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>{listing.location}</p>
            {tourStatus && (
              <div style={{ background: tourStatus.startsWith("✓") ? "var(--success)" : "#ef4444", color: "white", padding: "0.75rem 1rem", borderRadius: "var(--border-radius-sm)", marginBottom: "1.25rem", fontWeight: 600, fontSize: "0.9rem" }}>
                {tourStatus}
              </div>
            )}
            <div style={rowStyle}>
              <div><label style={labelStyle}>First Name *</label><input style={inputStyle} placeholder="Jane" value={tourForm.firstName} onChange={e => setTourForm(f => ({ ...f, firstName: e.target.value }))} /></div>
              <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} placeholder="Smith" value={tourForm.lastName} onChange={e => setTourForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            </div>
            <div style={rowStyle}>
              <div><label style={labelStyle}>Email *</label><input type="email" style={inputStyle} placeholder="jane@example.com" value={tourForm.email} onChange={e => setTourForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label style={labelStyle}>Phone *</label><input type="tel" style={inputStyle} placeholder="(555) 000-0000" value={tourForm.phone} onChange={e => setTourForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div style={rowStyle}>
              <div><label style={labelStyle}>Preferred Date *</label><input type="date" style={inputStyle} min={new Date().toISOString().split("T")[0]} value={tourForm.date} onChange={e => setTourForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div>
                <label style={labelStyle}>Preferred Time *</label>
                <select style={inputStyle} value={tourForm.time} onChange={e => setTourForm(f => ({ ...f, time: e.target.value }))}>
                  <option value="">Select time</option>
                  {["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"].map(t => (
                    <option key={t} value={t}>{new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Additional Notes</label>
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="Anything the agent should know..." value={tourForm.notes} onChange={e => setTourForm(f => ({ ...f, notes: e.target.value }))}></textarea>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", cursor: "pointer", marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={tourForm.sendCopy} onChange={e => setTourForm(f => ({ ...f, sendCopy: e.target.checked }))} />
              Send a copy of this request to my email
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleTourSubmit}>Confirm Tour Request</button>
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {modal === "contact" && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: "520px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={{ fontWeight: 800, margin: 0 }}>Contact Agent</h3>
              <button onClick={closeModal} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text-light)" }}>✕</button>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>{listing.location}</p>
            {contactStatus && (
              <div style={{ background: contactStatus.startsWith("✓") ? "var(--success)" : "#ef4444", color: "white", padding: "0.75rem 1rem", borderRadius: "var(--border-radius-sm)", marginBottom: "1.25rem", fontWeight: 600, fontSize: "0.9rem" }}>
                {contactStatus}
              </div>
            )}
            <div style={rowStyle}>
              <div><label style={labelStyle}>First Name *</label><input style={inputStyle} placeholder="Jane" value={contactForm.firstName} onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))} /></div>
              <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} placeholder="Smith" value={contactForm.lastName} onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            </div>
            <div style={rowStyle}>
              <div><label style={labelStyle}>Email *</label><input type="email" style={inputStyle} placeholder="jane@example.com" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label style={labelStyle}>Phone *</label><input type="tel" style={inputStyle} placeholder="(555) 000-0000" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Message *</label>
              <textarea style={{ ...inputStyle, resize: "vertical" }} rows={4} placeholder="I am interested in this property..." value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}></textarea>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", cursor: "pointer", marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={contactForm.sendCopy} onChange={e => setContactForm(f => ({ ...f, sendCopy: e.target.checked }))} />
              Send a copy of this message to my email
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleContactSubmit}>Send Message</button>
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};