import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { ListingSummary } from "../../api/contracts";
import { createEngagementApi } from "../../api/engagement";
import { createListingsApi } from "../../api/listings";
import { useAuth } from "../../auth/AuthProvider";
import { useApiClient } from "../../auth/useApiClient";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";

export const PropertyDetailsPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const authClient = useApiClient();  
  const listingsApi = useMemo(() => createListingsApi(authClient), [authClient]);
  const engagementApi = useMemo(() => createEngagementApi(authClient), [authClient]);

  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [inquiryMsg, setInquiryMsg] = useState("");
  const [status, setStatus] = useState<{ msg: string; isError: boolean } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    listingsApi.getPublicListing(id)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));

    if (session) {
      engagementApi.listFavorites().then(res => {
        setIsSaved(res.items.some(f => f.listingId === id));
      }).catch(() => { });
    }
  }, [id, session, listingsApi, engagementApi]);

  const toggleSave = async () => {
    if (!session) return alert("Please log in to save properties");
    if (!id) return;
    try {
      if (isSaved) {
        await engagementApi.removeFavorite(id);
        setIsSaved(false);
      } else {
        await engagementApi.addFavorite(id);
        setIsSaved(true);
      }
    } catch { }
  };

  const handleInquiry = async () => {
    if (!session) return alert("Please log in to contact agent");
    if (!id || !inquiryMsg.trim()) return;
    try {
      await engagementApi.createInquiry(id, inquiryMsg);
      setStatus({ msg: "Message sent to agent!", isError: false });
      setInquiryMsg("");
    } catch {
      setStatus({ msg: "Failed to send message", isError: true });
    }
  };

  const handleTour = async () => {
    if (!session) return alert("Please log in to request tour");
    if (!id) return;
    try {
      await engagementApi.createTourRequest(id, new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());
      setStatus({ msg: "Tour Request sent!", isError: false });
    } catch {
      setStatus({ msg: "Failed to schedule tour", isError: true });
    }
  };

  if (loading) return <div><Navbar /><div className="container mt-4">Loading...</div><Footer /></div>;
  if (!listing) return <div><Navbar /><div className="container mt-4">Property not found</div><Footer /></div>;

  const images = listing.mediaUrls?.length ? listing.mediaUrls : [
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200",
    "https://images.unsplash.com/photo-1600607687931-cecebd808cbd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400"
  ];

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <>
      <Navbar />
      <main className="container mb-5 mt-4">

        {/* Header Area */}
        <div className="d-flex justify-content-between align-items-center mb-4 text-center text-md-start" style={{ flexWrap: 'wrap' }}>
          <div>
            <span className="badge badge-success mb-2">{listing.status}</span>
            <h1 style={{ fontWeight: 800, margin: 0, fontSize: '2rem' }}>{listing.location}</h1>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>{listing.propertyType || "Property"}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ color: 'var(--primary-color)', fontWeight: 800, fontSize: '2.5rem', margin: 0 }}>{formatter.format(listing.price)}</h2>
            <button onClick={toggleSave} className={`btn ${isSaved ? 'btn-primary' : 'btn-outline'} mt-2`}>
              <i className={isSaved ? "bi bi-heart-fill me-2" : "bi bi-heart me-2"}></i>
              {isSaved ? "Saved" : "Save Property"}
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <div className="row mb-5" style={{ display: 'flex', gap: '1rem', height: '400px' }}>
          <div style={{ flex: 2, height: '100%', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
            <img src={images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Main" />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ flex: 1, borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
              <img src={images[1] || images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Interior" />
            </div>
            <div style={{ flex: 1, borderRadius: 'var(--border-radius-md)', overflow: 'hidden', position: 'relative' }}>
              <img src={images[2] || images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Interior" />
            </div>
          </div>
        </div>

        {/* Content Row */}
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>

          <div style={{ flex: 2, minWidth: '300px' }}>
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h3 style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>About This Home</h3>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {listing.description || "No description provided for this luxury property. Schedule a tour to discover its features in person."}
              </p>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '300px' }}>
            {/* Contact Agent Form */}
            <div className="card shadow-lg" style={{ padding: '2rem', position: 'sticky', top: '100px' }}>
              <h4 style={{ fontWeight: 800 }}>Contact Agent</h4>

              {status && (
                <div className={`badge mb-3 w-100 ${status.isError ? "badge-danger" : "badge-success"}`}>
                  {status.msg}
                </div>
              )}

              <div className="form-group mb-3">
                <textarea className="form-control" rows={4} placeholder="I am interested in this property..." value={inquiryMsg} onChange={e => setInquiryMsg(e.target.value)}></textarea>
              </div>

              <button className="btn btn-primary w-100 mb-3" onClick={handleInquiry}>Request Info</button>
              <button className="btn btn-outline w-100" onClick={handleTour}>Schedule a Tour</button>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
};
