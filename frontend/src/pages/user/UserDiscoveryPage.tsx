import { useEffect, useMemo, useState } from "react";
import type { ListingSummary } from "../../api/contracts";
import { createEngagementApi } from "../../api/engagement";
import { createListingsApi } from "../../api/listings";
import { useApiClient } from "../../auth/useApiClient";

export const UserDiscoveryPage = (): JSX.Element => {
  const client = useApiClient();
  const listingsApi = useMemo(() => createListingsApi(client), [client]);
  const engagementApi = useMemo(() => createEngagementApi(client), [client]);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [filters, setFilters] = useState({
    location: "",
    propertyType: "",
    priceMin: "",
    priceMax: "",
    sortBy: "createdAt" as "createdAt" | "price",
    sortDir: "desc" as "asc" | "desc",
    page: 1,
  });
  const [favorites, setFavorites] = useState<Array<{ listingId: string }>>([]);
  const [threads, setThreads] = useState<Array<{ id: string }>>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [threadMessages, setThreadMessages] = useState<Array<{ id: string; content: string }>>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; eventType: string }>>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const loadData = async (): Promise<void> => {
    Promise.all([
      listingsApi.getPublicListings({
        location: filters.location || undefined,
        propertyType: filters.propertyType || undefined,
        priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
        priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        page: filters.page,
        pageSize: 10,
      }),
      engagementApi.listFavorites(),
      engagementApi.listThreads(),
      engagementApi.listNotificationEvents(),
    ])
      .then(([publicListings, favorites, threads, notifications]) => {
        setListings(publicListings.items);
        setFavorites(favorites.items);
        setThreads(threads.items);
        setNotifications(notifications.items);
      })
      .catch(() => setListings([]));
  };

  useEffect(() => {
    void loadData();
  }, [engagementApi, listingsApi, filters]);

  const isFavorite = (listingId: string): boolean => favorites.some((favorite) => favorite.listingId === listingId);

  const toggleFavorite = async (listingId: string): Promise<void> => {
    if (isFavorite(listingId)) {
      await engagementApi.removeFavorite(listingId);
      setStatusMessage("Removed from favorites.");
    } else {
      await engagementApi.addFavorite(listingId);
      setStatusMessage("Saved to favorites.");
    }
    await loadData();
  };

  const contactAgent = async (listingId: string): Promise<void> => {
    await engagementApi.createInquiry(listingId, "Hello, I would like more details on this listing.");
    setStatusMessage("Inquiry sent.");
    await loadData();
  };

  const requestTour = async (listingId: string): Promise<void> => {
    await engagementApi.createTourRequest(listingId, new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());
    setStatusMessage("Tour request sent.");
  };

  const reviewListing = async (listingId: string): Promise<void> => {
    await engagementApi.reviewListing(listingId, 5, "Great listing details and responsive agent.");
    setStatusMessage("Review submitted.");
  };

  const viewThread = async (threadId: string): Promise<void> => {
    setSelectedThreadId(threadId);
    const response = await engagementApi.listThreadMessages(threadId);
    setThreadMessages(response.items);
  };

  const sendMessage = async (): Promise<void> => {
    if (!selectedThreadId || !messageDraft.trim()) {
      return;
    }
    await engagementApi.sendThreadMessage(selectedThreadId, messageDraft.trim());
    setMessageDraft("");
    await viewThread(selectedThreadId);
  };

  const saveNotificationPreference = async (listingId: string): Promise<void> => {
    await engagementApi.saveNotificationPreferences(listingId, { onPriceDrop: true, onStatusChange: true });
    setStatusMessage("Notification preferences saved.");
  };

  return (
    <div>
      <h2>User discovery</h2>
      {statusMessage ? <p>{statusMessage}</p> : null}
      <p>Available listings: {listings.length}</p>
      <p>Saved favorites: {favorites.length}</p>
      <p>Message threads: {threads.length}</p>
      <p>Notification events: {notifications.length}</p>

      <h3>Search filters</h3>
      <input
        value={filters.location}
        onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value, page: 1 }))}
        placeholder="Location"
      />
      <input
        value={filters.propertyType}
        onChange={(event) => setFilters((prev) => ({ ...prev, propertyType: event.target.value, page: 1 }))}
        placeholder="Property type"
      />
      <input
        value={filters.priceMin}
        onChange={(event) => setFilters((prev) => ({ ...prev, priceMin: event.target.value, page: 1 }))}
        placeholder="Min price"
      />
      <input
        value={filters.priceMax}
        onChange={(event) => setFilters((prev) => ({ ...prev, priceMax: event.target.value, page: 1 }))}
        placeholder="Max price"
      />
      <select
        value={filters.sortBy}
        onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value as "createdAt" | "price" }))}
      >
        <option value="createdAt">Newest</option>
        <option value="price">Price</option>
      </select>
      <select
        value={filters.sortDir}
        onChange={(event) => setFilters((prev) => ({ ...prev, sortDir: event.target.value as "asc" | "desc" }))}
      >
        <option value="desc">Desc</option>
        <option value="asc">Asc</option>
      </select>
      <button type="button" onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}>Prev</button>
      <span> Page {filters.page} </span>
      <button type="button" onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}>Next</button>

      <h3>Listings</h3>
      <ul>
        {listings.map((listing) => (
          <li key={listing.id}>
            {listing.location} - ${listing.price} ({listing.propertyType ?? "Unknown"})
            <button type="button" onClick={() => toggleFavorite(listing.id)}>
              {isFavorite(listing.id) ? "Unsave" : "Save"}
            </button>
            <button type="button" onClick={() => contactAgent(listing.id)}>Message agent</button>
            <button type="button" onClick={() => requestTour(listing.id)}>Request tour</button>
            <button type="button" onClick={() => reviewListing(listing.id)}>Review listing</button>
            <button type="button" onClick={() => saveNotificationPreference(listing.id)}>Notify me</button>
          </li>
        ))}
      </ul>

      <h3>Message threads</h3>
      <ul>
        {threads.map((thread) => (
          <li key={thread.id}>
            {thread.id}
            <button type="button" onClick={() => viewThread(thread.id)}>Open thread</button>
          </li>
        ))}
      </ul>
      {selectedThreadId ? (
        <div>
          <p>Thread: {selectedThreadId}</p>
          <ul>{threadMessages.map((message) => <li key={message.id}>{message.content}</li>)}</ul>
          <input
            value={messageDraft}
            onChange={(event) => setMessageDraft(event.target.value)}
            placeholder="Write a message"
          />
          <button type="button" onClick={sendMessage}>Send</button>
        </div>
      ) : null}

      <h3>Notification feed</h3>
      <ul>{notifications.map((item) => <li key={item.id}>{item.eventType}</li>)}</ul>
    </div>
  );
};
