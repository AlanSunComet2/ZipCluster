import { useEffect, useMemo, useState } from "react";
import { createAdminApi } from "../../api/admin";
import { useApiClient } from "../../auth/useApiClient";

export const AdminDashboardPage = (): JSX.Element => {
  const client = useApiClient();
  const adminApi = useMemo(() => createAdminApi(client), [client]);
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalAgents: number;
    totalListings: number;
    pendingListings: number;
    pendingAgentApplications: number;
    totalFavorites: number;
  } | null>(null);
  const [pendingAgents, setPendingAgents] = useState<Array<{ id: string; email?: string }>>([]);
  const [pendingListings, setPendingListings] = useState<Array<{ id: string; location: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string; role: string; isActive: boolean }>>([]);
  const [propertyCategories, setPropertyCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [geoCategories, setGeoCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [banners, setBanners] = useState<Array<{ id: string; title: string; imageUrl: string; isActive: boolean }>>([]);
  const [newPropertyCategory, setNewPropertyCategory] = useState("");
  const [newGeoCategory, setNewGeoCategory] = useState("");
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerImageUrl, setNewBannerImageUrl] = useState("");
  const [moderationHistory, setModerationHistory] = useState<Array<{ id: string; action: string; notes: string | null }>>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    Promise.all([
      adminApi.getAnalyticsOverview(),
      adminApi.getPendingAgents(),
      adminApi.getPendingListings(),
      adminApi.listUsers(),
      adminApi.listPropertyCategories(),
      adminApi.listGeoCategories(),
      adminApi.listBanners(),
    ])
      .then(([analytics, agents, listings, usersResponse, propertyResponse, geoResponse, bannerResponse]) => {
        setStats(analytics);
        setPendingAgents(agents.items);
        setPendingListings(listings.items);
        setUsers(usersResponse.items);
        setPropertyCategories(propertyResponse.items);
        setGeoCategories(geoResponse.items);
        setBanners(bannerResponse.items);
      })
      .catch(() => setStats(null));
  }, [adminApi]);

  const approveListing = async (listingId: string): Promise<void> => {
    await adminApi.approveListing(listingId, "Approved during demo moderation.");
    setPendingListings((prev) => prev.filter((listing) => listing.id !== listingId));
    setStatusMessage("Listing approved.");
  };

  const rejectListing = async (listingId: string): Promise<void> => {
    await adminApi.rejectListing(listingId, "Needs content revision.");
    setPendingListings((prev) => prev.filter((listing) => listing.id !== listingId));
    setStatusMessage("Listing rejected for revision.");
  };

  const loadListingHistory = async (listingId: string): Promise<void> => {
    const history = await adminApi.getListingModerationHistory(listingId);
    setModerationHistory(history.items);
  };

  const approveAgent = async (agentId: string): Promise<void> => {
    await adminApi.approveAgent(agentId);
    setPendingAgents((prev) => prev.filter((agent) => agent.id !== agentId));
    setStatusMessage("Agent approved.");
  };

  const rejectAgent = async (agentId: string): Promise<void> => {
    await adminApi.rejectAgent(agentId, "License verification failed.");
    setPendingAgents((prev) => prev.filter((agent) => agent.id !== agentId));
    setStatusMessage("Agent rejected.");
  };

  const toggleUserStatus = async (userId: string, isActive: boolean): Promise<void> => {
    if (isActive) {
      await adminApi.deactivateUser(userId);
    } else {
      await adminApi.reactivateUser(userId);
    }
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, isActive: !isActive } : user)),
    );
  };

  const createPropertyCategory = async (): Promise<void> => {
    if (!newPropertyCategory.trim()) {
      return;
    }
    const created = await adminApi.createPropertyCategory(newPropertyCategory.trim());
    setPropertyCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setNewPropertyCategory("");
  };

  const createGeoCategory = async (): Promise<void> => {
    if (!newGeoCategory.trim()) {
      return;
    }
    const created = await adminApi.createGeoCategory(newGeoCategory.trim());
    setGeoCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setNewGeoCategory("");
  };

  const createBanner = async (): Promise<void> => {
    if (!newBannerTitle.trim() || !newBannerImageUrl.trim()) {
      return;
    }
    await adminApi.createBanner({
      title: newBannerTitle.trim(),
      imageUrl: newBannerImageUrl.trim(),
      isActive: true,
    });
    const bannerResponse = await adminApi.listBanners();
    setBanners(bannerResponse.items);
    setNewBannerTitle("");
    setNewBannerImageUrl("");
  };

  return (
    <div>
      <h2>Admin dashboard</h2>
      {stats ? (
        <ul>
          <li>Total users: {stats.totalUsers}</li>
          <li>Total agents: {stats.totalAgents}</li>
          <li>Total listings: {stats.totalListings}</li>
          <li>Pending listings: {stats.pendingListings}</li>
          <li>Pending agent applications: {stats.pendingAgentApplications}</li>
          <li>Total favorites: {stats.totalFavorites}</li>
        </ul>
      ) : (
        <p>Unable to load analytics.</p>
      )}
      {statusMessage ? <p>{statusMessage}</p> : null}

      <h3>Pending agent applications ({pendingAgents.length})</h3>
      <ul>
        {pendingAgents.map((agent) => (
          <li key={agent.id}>
            {agent.email ?? agent.id}
            <button type="button" onClick={() => approveAgent(agent.id)}>Approve</button>
            <button type="button" onClick={() => rejectAgent(agent.id)}>Reject</button>
          </li>
        ))}
      </ul>

      <h3>Pending listings ({pendingListings.length})</h3>
      <ul>
        {pendingListings.map((listing) => (
          <li key={listing.id}>
            {listing.location} ({listing.id})
            <button type="button" onClick={() => approveListing(listing.id)}>Approve</button>
            <button type="button" onClick={() => rejectListing(listing.id)}>Reject</button>
            <button type="button" onClick={() => loadListingHistory(listing.id)}>View moderation history</button>
          </li>
        ))}
      </ul>
      {moderationHistory.length ? (
        <ul>
          {moderationHistory.map((entry) => (
            <li key={entry.id}>
              {entry.action}: {entry.notes ?? "No notes"}
            </li>
          ))}
        </ul>
      ) : null}

      <h3>User lifecycle management</h3>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.email} ({user.role}) - {user.isActive ? "active" : "inactive"}
            <button type="button" onClick={() => toggleUserStatus(user.id, user.isActive)}>
              {user.isActive ? "Deactivate" : "Reactivate"}
            </button>
          </li>
        ))}
      </ul>

      <h3>Property categories</h3>
      <input
        value={newPropertyCategory}
        onChange={(event) => setNewPropertyCategory(event.target.value)}
        placeholder="New property category"
      />
      <button type="button" onClick={createPropertyCategory}>Add</button>
      <ul>{propertyCategories.map((item) => <li key={item.id}>{item.name}</li>)}</ul>

      <h3>Geo categories</h3>
      <input
        value={newGeoCategory}
        onChange={(event) => setNewGeoCategory(event.target.value)}
        placeholder="New geo category"
      />
      <button type="button" onClick={createGeoCategory}>Add</button>
      <ul>{geoCategories.map((item) => <li key={item.id}>{item.name}</li>)}</ul>

      <h3>CMS banners</h3>
      <input
        value={newBannerTitle}
        onChange={(event) => setNewBannerTitle(event.target.value)}
        placeholder="Banner title"
      />
      <input
        value={newBannerImageUrl}
        onChange={(event) => setNewBannerImageUrl(event.target.value)}
        placeholder="Banner image URL"
      />
      <button type="button" onClick={createBanner}>Create banner</button>
      <ul>
        {banners.map((banner) => (
          <li key={banner.id}>{banner.title} ({banner.isActive ? "active" : "inactive"})</li>
        ))}
      </ul>
    </div>
  );
};
