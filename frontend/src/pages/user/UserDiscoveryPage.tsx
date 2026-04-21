import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { ListingSummary } from "../../api/contracts";
import { createListingsApi } from "../../api/listings";
import { useAuth } from "../../auth/AuthProvider";
import { ApiClient } from "../../api/client";
import { env } from "../../config/env";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { PropertyCard } from "../../components/listings/PropertyCard";

// Fix for default marker icons in Webpack/Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const selectedIcon = L.divIcon({
  className: "",
  html: `<div style="background:var(--primary-color,#4f46e5);color:white;padding:4px 10px;border-radius:20px;font-weight:700;font-size:0.75rem;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-family:Outfit,sans-serif;">Selected</div>`,
  iconAnchor: [30, 12],
});

const priceIcon = (price: number) => L.divIcon({
  className: "",
  html: `<div style="background:white;color:#1a1a2e;padding:4px 10px;border-radius:20px;font-weight:700;font-size:0.75rem;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:Outfit,sans-serif;border:2px solid #4f46e5;">$${(price / 1000).toFixed(0)}k</div>`,
  iconAnchor: [30, 12],
});

// Component to fit map bounds to listings
const MapBoundsUpdater = ({ listings }: { listings: ListingSummary[] }) => {
  const map = useMap();
  useEffect(() => {
    const geoListings = listings.filter(l => l.lat && l.lng);
    if (geoListings.length > 0) {
      const bounds = L.latLngBounds(geoListings.map(l => [l.lat!, l.lng!]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [listings, map]);
  return null;
};

export const UserDiscoveryPage = (): JSX.Element => {
  const { session } = useAuth();

  // Always use an unauthenticated public client for listings — this fixes the admin disappearing bug.
  // Engagement calls (favorites) are only made when authenticated and handled separately.
  const publicClient = useMemo(() => new ApiClient({ baseUrl: env.apiBaseUrl }), []);
  const listingsApi = useMemo(() => createListingsApi(publicClient), [publicClient]);

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    location: "",
    propertyType: "",
    priceMax: "",
    sortBy: "createdAt" as "createdAt" | "price",
  });

  const loadListings = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await listingsApi.getPublicListings({
        location: filters.location || undefined,
        propertyType: filters.propertyType || undefined,
        priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
        sortBy: filters.sortBy,
        sortDir: "desc",
        page: 1,
        pageSize: 20,
      });
      setListings(res.items);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
  }, []);

  const geoListings = listings.filter(l => l.lat && l.lng);
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      {/* Search Bar */}
      <div style={{ background: "var(--bg-secondary)", borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "1rem 0" }}>
        <div className="container" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div className="form-group mb-0" style={{ flex: 2, minWidth: "220px" }}>
            <input
              className="form-control"
              placeholder="City, Neighborhood, or ZIP code..."
              value={filters.location}
              onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && loadListings()}
            />
          </div>
          <div className="form-group mb-0">
            <select className="form-control " value={filters.propertyType}
              onChange={e => setFilters(f => ({ ...f, propertyType: e.target.value }))}>
              <option value="">All Property Types</option>
              <option value="House">House</option>
              <option value="Condo">Condo</option>
              <option value="Townhouse">Townhouse</option>
              <option value="Land">Land</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <select className="form-control" value={filters.priceMax}
              onChange={e => setFilters(f => ({ ...f, priceMax: e.target.value }))}>
              <option value="">Any Price</option>
              <option value="500000">Under $500k</option>
              <option value="1000000">Under $1M</option>
              <option value="2000000">Under $2M</option>
              <option value="5000000">Under $5M</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <select className="form-control" value={filters.sortBy}
              onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as "createdAt" | "price" }))}>
              <option value="createdAt">Newest First</option>
              <option value="price">Sort by Price</option>
            </select>
          </div>
          <button className="btn btn-primary mb-4" onClick={loadListings}>
            <i className="bi bi-search me-2"></i>Search
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 140px)" }}>

        {/* Left: Listings */}
        <div style={{ width: "45%", overflowY: "auto", padding: "1.5rem", background: "var(--bg-primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              {loading ? "Loading..." : `${listings.length} ${listings.length === 1 ? "Property" : "Properties"} Found`}
            </h2>
            {session && (
              <Link to="/saved" style={{ fontSize: "0.9rem", color: "var(--primary-color)", textDecoration: "none", fontWeight: 600 }}>
                <i className="bi bi-heart-fill me-1" style={{ marginRight: "0.25rem" }}></i>Saved Properties
              </Link>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)" }}>
              <i className="bi bi-hourglass-split" style={{ fontSize: "2rem", display: "block", marginBottom: "1rem" }}></i>
              Loading properties...
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)" }}>
              <i className="bi bi-house-slash" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}></i>
              <h3 style={{ fontWeight: 700 }}>No properties found</h3>
              <p>Try adjusting your search filters.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {listings.map(listing => (
                <Link key={listing.id} to={`/property/${listing.id}`} style={{ textDecoration: "none", color: "inherit" }}
                  onMouseEnter={() => setSelectedId(listing.id)}
                  onMouseLeave={() => setSelectedId(null)}>
                  <div className="card" style={{
                    display: "flex", flexDirection: "row", gap: "1rem", padding: "1rem",
                    transition: "all 0.2s ease",
                    border: selectedId === listing.id ? "2px solid var(--primary-color)" : "2px solid transparent",
                    transform: selectedId === listing.id ? "translateX(4px)" : "none",
                  }}>
                    <img
                      src={listing.mediaUrls?.[0] || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&q=80"}
                      style={{ width: "120px", height: "90px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }}
                      alt={listing.location}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--primary-color)", marginBottom: "0.25rem" }}>
                        {formatter.format(listing.price)}
                      </div>
                      <div style={{ fontWeight: 600, marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {listing.location}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {listing.propertyType && (
                          <span className="badge badge-primary" style={{ fontSize: "0.7rem" }}>{listing.propertyType}</span>
                        )}
                        {listing.zipCode && (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                            <i className="bi bi-geo-alt me-1"></i>{listing.zipCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Interactive Leaflet Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer
            center={[39.5, -98.35]}
            zoom={4}
            style={{ width: "100%", height: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBoundsUpdater listings={geoListings} />
            {geoListings.map(listing => (
              <Marker
                key={listing.id}
                position={[listing.lat!, listing.lng!]}
                icon={selectedId === listing.id ? selectedIcon : priceIcon(listing.price)}
                eventHandlers={{
                  click: () => setSelectedId(listing.id),
                  mouseover: () => setSelectedId(listing.id),
                }}
              >
                <Popup>
                  <div style={{ minWidth: "180px", fontFamily: "Outfit, sans-serif" }}>
                    {listing.mediaUrls?.[0] && (
                      <img src={listing.mediaUrls[0]} style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "4px", marginBottom: "0.5rem" }} alt="" />
                    )}
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#4f46e5" }}>{formatter.format(listing.price)}</div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{listing.location}</div>
                    {listing.zipCode && <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.5rem" }}>ZIP: {listing.zipCode}</div>}
                    {listing.propertyType && <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.5rem" }}>{listing.propertyType}</div>}
                    <a href={`/property/${listing.id}`} style={{ display: "block", background: "#4f46e5", color: "white", textAlign: "center", padding: "6px", borderRadius: "6px", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
                      View Details →
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

      </div>
    </div>
  );
};
