import { ApiClient } from "./client";

export const createAdminApi = (client: ApiClient) => ({
  listUsers: (): Promise<{ items: Array<{ id: string; email: string; role: string; isActive: boolean; isVerified: boolean }> }> =>
    client.request("GET", "/admin/users"),
  getPendingAgents: (): Promise<{ items: Array<{ id: string; email: string }> }> =>
    client.request<{ items: Array<{ id: string; email: string }> }>("GET", "/admin/agents/pending"),
  getPendingListings: (): Promise<{ items: Array<{ id: string; location: string }> }> =>
    client.request<{ items: Array<{ id: string; location: string }> }>("GET", "/admin/listings/pending"),
  getPendingAgentApplications: (): Promise<{ items: Array<{ id: string; applicantId: string; status: string }> }> =>
    client.request("GET", "/admin/agent-applications/pending"),
  approveListing: (listingId: string, notes?: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/listings/${listingId}/approve`, { notes }),
  rejectListing: (listingId: string, notes?: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/listings/${listingId}/reject`, { notes }),
  approveAgent: (agentId: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/agents/${agentId}/approve`),
  rejectAgent: (agentId: string, notes?: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/agents/${agentId}/reject`, { notes }),
  deactivateUser: (userId: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/users/${userId}/deactivate`),
  reactivateUser: (userId: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/users/${userId}/reactivate`),
  listPropertyCategories: (): Promise<{ items: Array<{ id: string; name: string }> }> =>
    client.request("GET", "/admin/property-categories"),
  createPropertyCategory: (name: string): Promise<{ id: string; name: string }> =>
    client.request("POST", "/admin/property-categories", { name }),
  listGeoCategories: (): Promise<{ items: Array<{ id: string; name: string }> }> =>
    client.request("GET", "/admin/geo-categories"),
  createGeoCategory: (name: string): Promise<{ id: string; name: string }> =>
    client.request("POST", "/admin/geo-categories", { name }),
  listBanners: (): Promise<{ items: Array<{ id: string; title: string; imageUrl: string; isActive: boolean }> }> =>
    client.request("GET", "/admin/cms/banners"),
  createBanner: (payload: {
    title: string;
    imageUrl: string;
    isActive?: boolean;
    ctaText?: string;
    ctaUrl?: string;
    sortOrder?: number;
  }): Promise<{ id: string }> => client.request("POST", "/admin/cms/banners", payload),
  getListingModerationHistory: (listingId: string): Promise<{ items: Array<{ id: string; action: string; notes: string | null; createdAt: string }> }> =>
    client.request("GET", `/admin/listings/${listingId}/moderation-history`),
  getAnalyticsOverview: (): Promise<{
    totalUsers: number;
    totalAgents: number;
    totalListings: number;
    pendingListings: number;
    approvedListings: number;
    soldListings: number;
    pendingAgentApplications: number;
    totalFavorites: number;
  }> => client.request("GET", "/admin/analytics/overview"),
});
