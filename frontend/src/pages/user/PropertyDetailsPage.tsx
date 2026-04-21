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

export const PropertyDetailsPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const authClient = useApiClient();
  const publicClient = useMemo(() => new ApiClient({ baseUrl: env.apiBaseUrl }), []);
  const listingsApi = useMemo(() => createListingsApi(publicClient), [publicClient]);
  const engagementApi = useMemo(() => createEngagementApi(authClient), [authClient]);

  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [modal, setModal] = useState<Modal>("none");
  const [copied, setCopied] = useState(false);

  // Tour form state
  const [tourForm, setTourForm] = useState({ firstName: "", lastName: "", email: "", phone: "", date: "", time: "", notes: "", sendCopy: false });
  const [tourStatus, setTourStatus] = useState("");

  // Contact form state
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", email: "", phone: "", message: "", sendCopy: false });
  const [contactStatus, setContactStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    listingsApi.getPublicListing(id)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
    if (session) {
      engagementApi.listFavorites().then(res => {
        setIsSaved(res.items.some(f => f.listingId === id));
      }).catch(() => {});
    }
  }, [id, session, listingsApi, engagementApi]);

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
    if (navigator.share) {
      await navigator.share({ title: listing?.location ?? "Property", url });
    } else {
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
      setTourStatus("Please fill in all required fields.");
      return;
    }
    try {
      const preferredTime = new Date(`${date}T${time}`).toISOString();
      await engagementApi.createTourRequest(id, preferredTime);
      setTourStatus("✓ Tour request sent! The agent will confirm your appointment.");
      setTourForm({ firstName: "", lastName: "", email: "", phone: "", date: "", time: "", notes: "", sendCopy: false });
    } catch {
      setTourStatus("✗ Failed to submit tour request. Please try again.");
    }
  };

  const handleContactSubmit = async () => {
    if (!session) return alert("Please log in to contact the agent");
    if (!id) return;
    const { firstName, lastName, email, phone, message } = contactForm;
    if (!firstName || !lastName || !email || !phone || !message.trim()) {
      setContactStatus("Please fill in all required fields.");
      return;
    }
    try {
      const fullMessage = `From: ${firstName} ${lastName} | Phone: ${phone} | Email: ${email}\n\n${message}`;
      await engagementApi.createInquiry(id, fullMessage);
      setContactStatus("✓ Message sent to agent!");
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", message: "", sendCopy: false });
    } catch {
      setContactStatus("✗ Failed to send message. Please try again.");
    }
  };

  const closeModal = () => { setModal("none"); setTourStatus(""); setContactStatus(""); };

  if (loading) return <div><Navbar /><div className="container mt-4">Loading...</div><Footer /></div>;
  if (!listing) return <div><Navbar /><div className="container mt-4">Property not found.</div><Footer /></div>;

  const images = listing.mediaUrls?.length ? listing.mediaUrls : [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687931-cecebd808cbd?w=600&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80",
  ];
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem 0.75rem", border: "1px solid rgba(0,0,0,0.15)", borderRadius: "var(--border-radius-sm)", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--bg-secondary)" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-light)", marginBottom: "0.35rem", textTransform: "uppercase" };
  const rowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" };

  return (
    <>
      <Navbar />
      <main className="container mb-5 mt-4">

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <span className="badge badge-success mb-2">{listing.status}</span>
            <h1 style={{ fontWeight: 800, margin: 0, fontSize: "2rem" }}>{listing.location}</h1>
            <p className="text-muted" style={{ fontSize: "1.1rem", margin: 0 }}>{listing.propertyType || "Property"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ color: "var(--primary-color)", fontWeight: 800, fontSize: "2.5rem", margin: 0 }}>{formatter.format(listing.price)}</h2>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={toggleSave} className={`btn ${isSaved ? "btn-primary" : "btn-outline"}`}>
                <i className={`bi ${isSaved ? "bi-heart-fill" : "bi-heart"} me-1`}></i>{isSaved ? "Saved" : "Save"}
              </button>
              <button onClick={handleShare} className="btn btn-outline">
                <i className={`bi ${copied ? "bi-check2" : "bi-share"} me-1`}></i>{copied ? "Copied!" : "Share"}
              </button>
            </div>
          </div>
          {/* Add this block right below where the Price and Location are displayed */}
          <div style={{ 
            display: "flex", 
            gap: "1.5rem", 
            padding: "1rem 0", 
            borderTop: "1px solid rgba(0,0,0,0.1)", 
            borderBottom: "1px solid rgba(0,0,0,0.1)", 
            marginBottom: "2rem",
            flexWrap: "wrap"
          }}>
            {listing.propertyType && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-light)", textTransform: "uppercase", fontWeight: 700 }}>Type</span>
                <span style={{ fontWeight: 600, fontSize: "1.1rem" }}><i className="bi bi-house-door me-2"></i>{listing.propertyType}</span>
              </div>
            )}
            
            {listing.bedrooms != null && (
              <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid #eee", paddingLeft: "1.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-light)", textTransform: "uppercase", fontWeight: 700 }}>Bedrooms</span>
                <span style={{ fontWeight: 600, fontSize: "1.1rem" }}><i className="bi bi-door-open me-2"></i>{listing.bedrooms} Beds</span>
              </div>
            )}

            {listing.bathrooms != null && (
              <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid #eee", paddingLeft: "1.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-light)", textTransform: "uppercase", fontWeight: 700 }}>Bathrooms</span>
                <span style={{ fontWeight: 600, fontSize: "1.1rem" }}><i className="bi bi-droplet me-2"></i>{listing.bathrooms} Baths</span>
              </div>
            )}

            {listing.squareFeet != null && (
              <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid #eee", paddingLeft: "1.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-light)", textTransform: "uppercase", fontWeight: 700 }}>Square Feet</span>
                <span style={{ fontWeight: 600, fontSize: "1.1rem" }}><i className="bi bi-arrows-fullscreen me-2"></i>{listing.squareFeet.toLocaleString()} sqft</span>
              </div>
            )}
          </div>
        </div>

        {/* Image Gallery */}
        <div style={{ display: "flex", gap: "0.75rem", height: "420px", marginBottom: "2.5rem" }}>
          {/* Main image — clickable to open full view */}
          <div
            onClick={() => setModal("image")}
            style={{ flex: 2, borderRadius: "var(--border-radius-md)", overflow: "hidden", cursor: "zoom-in", position: "relative" }}
          >
            <img src={images[activeImage]} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Main" />
            <div style={{ position: "absolute", bottom: "1rem", right: "1rem", background: "rgba(0,0,0,0.55)", color: "white", borderRadius: "50px", padding: "0.35rem 0.9rem", fontSize: "0.8rem", fontWeight: 600 }}>
              <i className="bi bi-arrows-fullscreen me-1"></i>View Full
            </div>
          </div>
          {/* Thumbnails */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {images.slice(0, 3).map((img, i) => (
              <div
                key={i}
                onClick={() => setActiveImage(i)}
                style={{ flex: 1, borderRadius: "var(--border-radius-md)", overflow: "hidden", cursor: "pointer", border: activeImage === i ? "2px solid var(--primary-color)" : "2px solid transparent", position: "relative" }}
              >
                <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={`View ${i + 1}`} />
                {i === 2 && images.length > 3 && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "1.2rem" }}>
                    +{images.length - 3}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
          <div style={{ flex: 2, minWidth: "300px" }}>
            <div className="card" style={{ padding: "2rem" }}>
              <h3 style={{ borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>About This Home</h3>
              <p style={{ fontSize: "1.05rem", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
                {listing.description || "No description provided. Schedule a tour to discover its features in person."}
              </p>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div style={{ flex: 1, minWidth: "300px" }}>
            <div className="card" style={{ padding: "2rem", position: "sticky", top: "100px" }}>
              <h4 style={{ fontWeight: 800, marginBottom: "1.5rem" }}>Interested in this home?</h4>
              {statusMsg && <div className="badge badge-success mb-3" style={{ display: "block", padding: "0.6rem" }}>{statusMsg}</div>}
              <button className="btn btn-primary w-100 mb-3" onClick={() => setModal("tour")}>
                <i className="bi bi-calendar-check me-2"></i>Schedule a Tour
              </button>
              <button className="btn btn-outline w-100 mb-3" onClick={() => setModal("contact")}>
                <i className="bi bi-chat-left-text me-2"></i>Contact Agent
              </button>
              <button onClick={handleShare} className="btn btn-outline w-100">
                <i className={`bi ${copied ? "bi-check2" : "bi-share"} me-2`}></i>{copied ? "Link Copied!" : "Share Property"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Full Image Modal */}
      {modal === "image" && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <button onClick={closeModal} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "50%", width: "40px", height: "40px", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
          <img src={images[activeImage]} onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: "var(--border-radius-md)" }} alt="Full view" />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            {images.map((img, i) => (
              <img key={i} src={img} onClick={e => { e.stopPropagation(); setActiveImage(i); }} style={{ width: "64px", height: "48px", objectFit: "cover", borderRadius: "6px", cursor: "pointer", border: activeImage === i ? "2px solid white" : "2px solid transparent", opacity: activeImage === i ? 1 : 0.6 }} alt="" />
            ))}
          </div>
        </div>
      )}

      {/* Tour Modal */}
      {modal === "tour" && (
        <div onClick={closeModal} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: "560px", padding: "2rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
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
                  {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map(t => (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
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