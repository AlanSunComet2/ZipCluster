import { useEffect, useMemo, useState } from "react";
import type { ListingSummary } from "../../api/contracts";
import { createAgentApi } from "../../api/agent";
import { useApiClient } from "../../auth/useApiClient";

export const AgentDashboardPage = (): JSX.Element => {
  const client = useApiClient();
  const agentApi = useMemo(() => createAgentApi(client), [client]);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [verification, setVerification] = useState<{ status: string; applicationStatus: string } | null>(null);
  const [inquiries, setInquiries] = useState<Array<{ id: string; message: string }>>([]);
  const [tourRequests, setTourRequests] = useState<Array<{ id: string; status: string; preferredTime: string }>>([]);
  const [newListing, setNewListing] = useState({
    price: "0",
    location: "",
    propertyType: "",
    description: "",
    mediaUrls: "",
  });
  const [applicationDocUrl, setApplicationDocUrl] = useState("");
  const [inquiryResponse, setInquiryResponse] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState("");

  const loadData = async (): Promise<void> => {
    Promise.all([
      agentApi.listMyListings(),
      agentApi.getVerificationStatus(),
      agentApi.listInquiries(),
      agentApi.listTourRequests(),
    ])
      .then(([listingsResponse, verificationResponse, inquiriesResponse, toursResponse]) => {
        setListings(listingsResponse.items);
        setVerification(verificationResponse);
        setInquiries(inquiriesResponse.items);
        setTourRequests(toursResponse.items);
      })
      .catch(() => setListings([]));
  };

  useEffect(() => {
    void loadData();
  }, [agentApi]);

  const submitApplication = async (): Promise<void> => {
    if (!applicationDocUrl.trim()) {
      return;
    }
    await agentApi.submitApplication({
      notes: "Submitted from agent dashboard",
      licenseDocuments: [{ fileUrl: applicationDocUrl.trim(), mimeType: "application/pdf" }],
    });
    setApplicationDocUrl("");
    setStatusMessage("Application submitted.");
    await loadData();
  };

  const createListing = async (): Promise<void> => {
    await agentApi.createListing({
      price: Number(newListing.price),
      location: newListing.location,
      propertyType: newListing.propertyType || undefined,
      description: newListing.description,
      mediaUrls: newListing.mediaUrls
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
    setStatusMessage("Listing created.");
    setNewListing({ price: "0", location: "", propertyType: "", description: "", mediaUrls: "" });
    await loadData();
  };

  const markListingSold = async (listing: ListingSummary): Promise<void> => {
    await agentApi.updateListing(listing.id, { status: "SOLD" });
    setStatusMessage("Listing marked as sold.");
    await loadData();
  };

  const deleteListing = async (listingId: string): Promise<void> => {
    await agentApi.deleteListing(listingId);
    setStatusMessage("Listing deleted.");
    await loadData();
  };

  const respondToInquiry = async (inquiryId: string): Promise<void> => {
    const message = inquiryResponse[inquiryId]?.trim();
    if (!message) {
      return;
    }
    await agentApi.respondToInquiry(inquiryId, message);
    setInquiryResponse((prev) => ({ ...prev, [inquiryId]: "" }));
    setStatusMessage("Inquiry response sent.");
  };

  const confirmTour = async (tourId: string): Promise<void> => {
    await agentApi.updateTourRequest(tourId, "CONFIRMED");
    setStatusMessage("Tour request confirmed.");
    await loadData();
  };

  return (
    <div>
      <h2>Agent dashboard</h2>
      <p>My listings: {listings.length}</p>
      <p>Verification: {verification?.status ?? "unknown"}</p>
      <p>Application status: {verification?.applicationStatus ?? "PENDING"}</p>
      <p>Open inquiries: {inquiries.length}</p>
      {statusMessage ? <p>{statusMessage}</p> : null}

      <h3>Verification onboarding</h3>
      <input
        value={applicationDocUrl}
        onChange={(event) => setApplicationDocUrl(event.target.value)}
        placeholder="License document URL"
      />
      <button type="button" onClick={submitApplication}>Submit application</button>

      <h3>Create listing</h3>
      <input
        value={newListing.location}
        onChange={(event) => setNewListing((prev) => ({ ...prev, location: event.target.value }))}
        placeholder="Location"
      />
      <input
        value={newListing.price}
        onChange={(event) => setNewListing((prev) => ({ ...prev, price: event.target.value }))}
        placeholder="Price"
      />
      <input
        value={newListing.propertyType}
        onChange={(event) => setNewListing((prev) => ({ ...prev, propertyType: event.target.value }))}
        placeholder="Property type"
      />
      <textarea
        value={newListing.description}
        onChange={(event) => setNewListing((prev) => ({ ...prev, description: event.target.value }))}
        placeholder="Description"
      />
      <input
        value={newListing.mediaUrls}
        onChange={(event) => setNewListing((prev) => ({ ...prev, mediaUrls: event.target.value }))}
        placeholder="Comma-separated media URLs"
      />
      <button type="button" onClick={createListing}>Create listing</button>

      <h3>My listings</h3>
      <ul>
        {listings.map((listing) => (
          <li key={listing.id}>
            {listing.location} - ${listing.price} ({listing.status})
            <button type="button" onClick={() => markListingSold(listing)}>Mark sold</button>
            <button type="button" onClick={() => deleteListing(listing.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <h3>Inquiries</h3>
      <ul>
        {inquiries.map((inquiry) => (
          <li key={inquiry.id}>
            {inquiry.message}
            <input
              value={inquiryResponse[inquiry.id] ?? ""}
              onChange={(event) => setInquiryResponse((prev) => ({ ...prev, [inquiry.id]: event.target.value }))}
              placeholder="Response message"
            />
            <button type="button" onClick={() => respondToInquiry(inquiry.id)}>Send response</button>
          </li>
        ))}
      </ul>

      <h3>Tour requests</h3>
      <ul>
        {tourRequests.map((tour) => (
          <li key={tour.id}>
            {new Date(tour.preferredTime).toLocaleString()} - {tour.status}
            {tour.status === "REQUESTED" ? (
              <button type="button" onClick={() => confirmTour(tour.id)}>Confirm</button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};
