import { ApiClient } from "./client";

export type AdminListingStatus = "PENDING" | "APPROVED" | "SOLD";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface AdminListingSummary {
  id: string;
  location: string;
  price: number;
  status: AdminListingStatus;
  propertyType: string | null;
  agentId: string;
  zipCode: string | null;
  description: string;
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminListingDetails extends AdminListingSummary {
  agent: { id: string; email: string } | null;
}

export interface AdminPendingAgent {
  id: string;
  email: string;
  createdAt: string;
  application: {
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
    reviewedAt: string | null;
    licenseDocs: Array<{ id: string; fileUrl: string; mimeType: string; uploadedAt: string }>;
  } | null;
}

export interface AdminBanner {
  id: string;
  title: string;
  imageUrl: string;
  ctaText: string | null;
  ctaUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminCategory {
  id: string;
  name: string;
}

export interface AdminListingUpdatePayload {
  price?: number;
  location?: string;
  zipCode?: string;
  propertyType?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  status?: AdminListingStatus;
  mediaUrls?: string[];
  notes?: string;
}

export interface ResetPasswordResponse {
  message: string;
  temporaryPassword: string;
  resetToken: string;
  resetUrl: string;
  expiresAt: string;
}

export const createAdminApi = (client: ApiClient) => ({
  listUsers: (): Promise<{ items: AdminUser[] }> =>
    client.request("GET", "/admin/users"),
  getPendingAgents: (): Promise<{ items: AdminPendingAgent[] }> =>
    client.request("GET", "/admin/agents/pending"),
  getListings: (status?: AdminListingStatus | "ALL"): Promise<{ items: AdminListingSummary[] }> => {
    if (!status || status === "ALL") {
      return client.request("GET", "/admin/listings");
    }
    return client.request("GET", `/admin/listings?status=${status}`);
  },
  getListingDetails: (listingId: string): Promise<AdminListingDetails> =>
    client.request("GET", `/admin/listings/${listingId}`),
  getPendingListings: (): Promise<{ items: AdminListingSummary[] }> =>
    client.request("GET", "/admin/listings/pending"),
  approveListing: (listingId: string, notes?: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/listings/${listingId}/approve`, { notes }),
  rejectListing: (listingId: string, notes?: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/listings/${listingId}/reject`, { notes }),
  updateListing: (
    listingId: string,
    payload: AdminListingUpdatePayload,
  ): Promise<{ message: string; listing: AdminListingSummary | null }> =>
    client.request("PATCH", `/admin/listings/${listingId}`, payload),
  deleteListing: (listingId: string, notes?: string): Promise<{ message: string }> =>
    client.request("DELETE", `/admin/listings/${listingId}`, { confirm: "DELETE", notes }),
  approveAgent: (agentId: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/agents/${agentId}/approve`),
  rejectAgent: (agentId: string, notes: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/agents/${agentId}/reject`, { notes }),
  requestAgentDocuments: (agentId: string, message: string): Promise<{ message: string }> =>
    client.request("POST", `/admin/agents/${agentId}/request-documents`, { message }),
  deactivateUser: (userId: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/users/${userId}/deactivate`),
  reactivateUser: (userId: string): Promise<{ message: string }> =>
    client.request("PATCH", `/admin/users/${userId}/reactivate`),
  resetUserPassword: (userId: string): Promise<ResetPasswordResponse> =>
    client.request("POST", `/admin/users/${userId}/reset-password`),

  listPropertyCategories: (): Promise<{ items: AdminCategory[] }> =>
    client.request("GET", "/admin/property-categories"),
  createPropertyCategory: (name: string): Promise<AdminCategory> =>
    client.request("POST", "/admin/property-categories", { name }),
  updatePropertyCategory: (id: string, name: string): Promise<AdminCategory> =>
    client.request("PATCH", `/admin/property-categories/${id}`, { name }),
  deletePropertyCategory: (id: string): Promise<void> =>
    client.request("DELETE", `/admin/property-categories/${id}`),

  listGeoCategories: (): Promise<{ items: AdminCategory[] }> =>
    client.request("GET", "/admin/geo-categories"),
  createGeoCategory: (name: string): Promise<AdminCategory> =>
    client.request("POST", "/admin/geo-categories", { name }),
  updateGeoCategory: (id: string, name: string): Promise<AdminCategory> =>
    client.request("PATCH", `/admin/geo-categories/${id}`, { name }),
  deleteGeoCategory: (id: string): Promise<void> =>
    client.request("DELETE", `/admin/geo-categories/${id}`),

  listBanners: (): Promise<{ items: AdminBanner[] }> =>
    client.request("GET", "/admin/cms/banners"),
  createBanner: (payload: {
    title: string;
    imageUrl: string;
    isActive?: boolean;
    ctaText?: string;
    ctaUrl?: string;
    sortOrder?: number;
  }): Promise<AdminBanner> => client.request("POST", "/admin/cms/banners", payload),
  updateBanner: (id: string, payload: Partial<{
    title: string;
    imageUrl: string;
    isActive: boolean;
    ctaText: string;
    ctaUrl: string;
    sortOrder: number;
  }>): Promise<AdminBanner> => client.request("PATCH", `/admin/cms/banners/${id}`, payload),
  deleteBanner: (id: string): Promise<void> =>
    client.request("DELETE", `/admin/cms/banners/${id}`),

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
