import { useEffect, useMemo, useState } from "react";
import type { ListingSummary } from "../../api/contracts";
import { createEngagementApi } from "../../api/engagement";
import { createListingsApi } from "../../api/listings";
import { useAuth } from "../../auth/AuthProvider";
import { useApiClient } from "../../auth/useApiClient";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { PropertyCard } from "../../components/listings/PropertyCard";

export const SavedPropertiesPage = (): JSX.Element => {
   const { session } = useAuth();

   const authClient = useApiClient();
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
         <main
            className="container"
            style={{
               minHeight: '60vh',
               marginTop: '20px',
               marginBottom: '40px'
            }}
         >
            <div
               className="d-flex justify-content-between align-items-center"
               style={{ marginBottom: '25px' }}
            >
               <h1
                  style={{
                     fontWeight: 800,
                     fontSize: '1.75rem', // Reduced from default h1
                     margin: 0,           // Removes browser default spacing
                     display: 'flex',
                     alignItems: 'center'
                  }}
               >
                  <i
                     className="bi bi-heart-fill text-danger"
                     style={{ marginRight: '12px', fontSize: '1.5rem', color: 'red' }}
                  ></i>
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
