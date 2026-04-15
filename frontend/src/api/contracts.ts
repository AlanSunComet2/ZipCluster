export type UserRole = "ADMIN" | "AGENT" | "USER";

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  role: "USER" | "AGENT";
}

export interface RefreshInput {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ListingSummary {
  id: string;
  price: number;
  location: string;
  propertyType: string | null;
  status: "PENDING" | "APPROVED" | "SOLD";
  description?: string;
  mediaUrls?: string[];
}

export interface PagedListingsResponse {
  items: ListingSummary[];
  pagination?: { page: number; pageSize: number };
}

export interface FavoriteRecord {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
}

export interface InquiryRecord {
  id: string;
  listingId: string;
  buyerId: string;
  message: string;
  threadId: string;
  createdAt: string;
}

export interface MessageThreadRecord {
  id: string;
  listingId: string;
  inquiryId: string | null;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

export interface NotificationEventRecord {
  id: string;
  listingId: string;
  eventType: string;
  payload: unknown;
  createdAt: string;
}
