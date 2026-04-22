import type { ListingSummary, PagedListingsResponse } from "./contracts";
import { ApiClient } from "./client";

export interface ListingQuery {
  priceMin?: number;
  priceMax?: number;
  location?: string;
  propertyType?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "price";
  sortDir?: "asc" | "desc";
}

const toQueryString = (query: ListingQuery): string => {
  const params = new URLSearchParams();
  if (query.priceMin !== undefined) params.set("priceMin", String(query.priceMin));
  if (query.priceMax !== undefined) params.set("priceMax", String(query.priceMax));
  if (query.location) params.set("location", query.location);
  if (query.propertyType) params.set("propertyType", query.propertyType);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  const text = params.toString();
  return text ? `?${text}` : "";
};

export const createListingsApi = (client: ApiClient) => ({
  getPublicListings: (query: ListingQuery): Promise<PagedListingsResponse> =>
    client.request<PagedListingsResponse>("GET", `/listings${toQueryString(query)}`),
  getPublicListing: (id: string): Promise<ListingSummary> =>
    client.request<ListingSummary>("GET", `/listings/${id}`),
  getListingAgent: (listingId: string): Promise<{ id: string; email: string; memberSince: string; avgRating: number | null; totalReviews: number; recentReviews: Array<{ rating: number; reviewerEmail: string; createdAt: string }> }> =>
    client.request("GET", `/listings/${listingId}/agent`),
  getUserListings: (query: ListingQuery): Promise<{ items: ListingSummary[] }> =>
    client.request<{ items: ListingSummary[] }>("GET", `/users/listings${toQueryString(query)}`),
  getPublicAgents: (): Promise<{ items: Array<{ id: string; email: string; createdAt: string }> }> =>
    client.request("GET", "/listings/agents"),
  getAgentReviews: (agentId: string): Promise<{ items: Array<{ id: string; rating: number; reviewerEmail: string; createdAt: string }>; avgRating: number | null; totalReviews: number }> =>
    client.request("GET", `/listings/agents/${agentId}/reviews`),
});