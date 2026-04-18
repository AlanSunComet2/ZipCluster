import { Link } from "react-router-dom";
import type { ListingSummary } from "../../api/contracts";

export const PropertyCard = ({ listing }: { listing: ListingSummary }): JSX.Element => {
  // Use first mediaUrl or fallback to a premium placeholder
  const imageUrl = listing.mediaUrls?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="card">
      <img src={imageUrl} alt={listing.location} className="card-img" />
      <div className="card-body" style={{ padding: '1.5rem' }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary-color)' }}>
            {formatPrice(listing.price)}
          </h3>
          {listing.status === 'SOLD' && <span className="badge badge-danger">Sold</span>}
          {listing.status === 'PENDING' && <span className="badge badge-warning">Pending</span>}
        </div>
        <p className="text-muted mb-3" style={{ fontSize: '0.95rem' }}>
          <i className="bi bi-geo-alt" style={{ marginRight: '6px', color: 'var(--secondary-color)' }}></i>
          {listing.location}
        </p>
        
        <div className="d-flex justify-content-between text-muted mb-4" style={{ fontSize: '0.9rem' }}>
          <span><i className="bi bi-house-door"></i> {listing.propertyType || "Property"}</span>
          {/* Optional fallback details if schema expands */}
          <span><i className="bi bi-droplet"></i> Baths</span>
          <span><i className="bi bi-arrows-fullscreen"></i> Sq.Ft</span>
        </div>
        
        <Link to={`/property/${listing.id}`} className="btn btn-outline w-100">
          View Details
        </Link>
      </div>
    </div>
  );
};
