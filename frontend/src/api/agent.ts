import type { ListingSummary } from "./contracts";
import { ApiClient } from "./client";

export interface AgentListingInput {
  price: number;
  location: string;
  description: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  status?: "DRAFT" | "PENDING" | "SOLD";
  mediaUrls?: string[];
}

// Add this interface near the top
export interface AgentProfileInput {
  fullName?: string;
  contactEmail: string;
  phoneNumber?: string;
  licenseNumber: string;
  licenseExpirationDate?: string;
  licenseUrl?: string;
}

export const createAgentApi = (client: ApiClient) => ({
  getVerificationStatus: (): Promise<{ 
    status: "pending" | "approved"; 
    isActive: boolean; 
    applicationStatus: string; 
    latestApplication?: any;
    user?: { email: string; contactEmail?: string; fullName?: string; phoneNumber?: string; licenseNumber?: string; licenseExpirationDate?: string } 
  }> => client.request("GET", "/agents/verification-status"),

  // Add this new method
  updateProfile: (payload: AgentProfileInput): Promise<{ message: string }> =>
    client.request("PUT", "/agents/me/profile", payload),

  listMyListings: (): Promise<{ items: ListingSummary[] }> =>
    client.request<{ items: ListingSummary[] }>("GET", "/agents/me/listings"),
  createListing: (payload: AgentListingInput): Promise<ListingSummary> =>
    client.request<ListingSummary, AgentListingInput>("POST", "/agents/me/listings", payload),
  updateListing: (listingId: string, payload: Partial<AgentListingInput> & { status?: "PENDING" | "APPROVED" | "SOLD" }): Promise<ListingSummary> =>
    client.request("PATCH", `/agents/me/listings/${listingId}`, payload),
  deleteListing: (listingId: string): Promise<void> =>
    client.request("DELETE", `/agents/me/listings/${listingId}`),
  addListingMedia: (listingId: string, mediaUrl: string): Promise<ListingSummary> =>
    client.request("POST", `/agents/me/listings/${listingId}/media`, { mediaUrl }),
  submitApplication: (payload: {
    notes?: string;
    licenseDocuments: Array<{ fileUrl: string; mimeType: string }>;
  }): Promise<{ id: string; status: string }> => client.request("POST", "/agents/me/application", payload),
  listInquiries: (): Promise<{ items: Array<{ id: string; message: string; threadId: string }> }> =>
    client.request("GET", "/agents/inquiries"),
  respondToInquiry: (inquiryId: string, message: string): Promise<{ id: string; content: string }> =>
    client.request("POST", `/agents/inquiries/${inquiryId}/respond`, { message }),
  listTourRequests: (): Promise<{ items: Array<{ id: string; status: string; preferredTime: string }> }> =>
    client.request("GET", "/agents/tour-requests"),
  updateTourRequest: (tourId: string, status: "REQUESTED" | "CONFIRMED" | "DECLINED"): Promise<{ id: string; status: string }> =>
    client.request("PATCH", `/agents/tour-requests/${tourId}`, { status }),
});
