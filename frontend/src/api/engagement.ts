import type {
  FavoriteRecord,
  MessageRecord,
  MessageThreadRecord,
  NotificationEventRecord,
} from "./contracts";
import { ApiClient } from "./client";

export const createEngagementApi = (client: ApiClient) => ({
  listFavorites: (): Promise<{ items: FavoriteRecord[] }> =>
    client.request<{ items: FavoriteRecord[] }>("GET", "/users/me/favorites"),
  addFavorite: (listingId: string): Promise<FavoriteRecord> =>
    client.request<FavoriteRecord>("POST", `/users/me/favorites/${listingId}`),
  removeFavorite: (listingId: string): Promise<void> =>
    client.request<void>("DELETE", `/users/me/favorites/${listingId}`),
  createInquiry: (listingId: string, message: string): Promise<{ id: string }> =>
    client.request<{ id: string }, { message: string }>(
      "POST",
      `/users/listings/${listingId}/inquiries`,
      { message },
    ),
  createTourRequest: (listingId: string, preferredTime: string): Promise<{ id: string; status: string }> =>
    client.request("POST", `/users/listings/${listingId}/tour-requests`, { preferredTime }),
  reviewAgent: (agentId: string, rating: number, comment?: string): Promise<{ id: string }> =>
    client.request("POST", `/users/agents/${agentId}/reviews`, { rating, comment }),
  reviewListing: (listingId: string, rating: number, comment?: string): Promise<{ id: string }> =>
    client.request("POST", `/users/listings/${listingId}/reviews`, { rating, comment }),
  saveNotificationPreferences: (
    listingId: string,
    payload: { onPriceDrop?: boolean; onStatusChange?: boolean },
  ): Promise<{ id: string }> => client.request("POST", `/users/me/notifications/${listingId}/preferences`, payload),
  listNotificationEvents: (): Promise<{ items: NotificationEventRecord[] }> =>
    client.request("GET", "/users/me/notifications/events"),
  listThreads: (): Promise<{ items: MessageThreadRecord[] }> =>
    client.request("GET", "/users/me/messages/threads"),
  listThreadMessages: (threadId: string): Promise<{ items: MessageRecord[] }> =>
    client.request("GET", `/users/me/messages/threads/${threadId}`),
  sendThreadMessage: (threadId: string, content: string): Promise<MessageRecord> =>
    client.request("POST", `/users/me/messages/threads/${threadId}`, { content }),
});
