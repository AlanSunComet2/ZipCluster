import { useEffect, useMemo, useState } from "react";
import type { ListingSummary } from "../../api/contracts";
import { createEngagementApi } from "../../api/engagement";
import { createListingsApi } from "../../api/listings";
import { useAuth } from "../../auth/AuthProvider";
import { ApiClient } from "../../api/client";
import { env } from "../../config/env";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { PropertyCard } from "../../components/listings/PropertyCard";

export const SavedPropertiesPage = (): JSX.Element => {
  const { session } = useAuth();
  
  const authClient = useMemo(() => new ApiClient({ baseUrl: env.apiBaseUrl }), []);
  const engagementApi = useMemo(() => createEngagementApi(authClient), [authClient]);
  const listingsApi = useMemo(() => createListingsApi(authClient), [authClient]);

  const [savedListings, setSavedListings] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    engagementApi.listFavorites().then(async (res) => {
        const listings = await Promise.all(
           res.items.map(async fav => {
               try {
                  return await listingsApi.getPublicListing(fav.listingId);
               } catch {
                  return null;
               }
           })
        );
        setSavedListings(listings.filter((l): l is ListingSummary => l !== null));
        setLoading(false);
    }).catch(() => setLoading(false));
  }, [session, engagementApi, listingsApi]);

  return (
    <>
      <Navbar />
      <main className="container my-5" style={{ minHeight: '60vh' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 style={{ fontWeight: 800 }}>
               <i className="bi bi-heart-fill text-danger me-2" style={{ color: 'var(--danger)' }}></i> 
               Saved Properties ({savedListings.length})
            </h1>
        </div>

        {loading ? (
           <p className="text-muted fs-5">Loading your saved properties...</p>
        ) : savedListings.length === 0 ? (
           <div className="text-center py-5">
              <i className="bi bi-heart fs-1 text-muted mb-3 d-block"></i>
              <h3 className="fw-bold">No saved properties yet</h3>
              <p className="text-muted">Properties you save will appear here.</p>
           </div>
        ) : (
           <div className="grid-3">
              {savedListings.map(listing => (
                 <PropertyCard key={listing.id} listing={listing} />
              ))}
           </div>
        )}
      </main>
      <Footer />
    </>
  );
};
