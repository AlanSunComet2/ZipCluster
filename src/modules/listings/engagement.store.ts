import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export interface InquiryRecord {
  id: string;
  listingId: string;
  buyerId: string;
  message: string;
  threadId: string;
  createdAt: Date;
}

export interface TourRequestRecord {
  id: string;
  listingId: string;
  buyerId: string;
  preferredTime: Date;
  status: "REQUESTED" | "CONFIRMED" | "DECLINED";
}

export interface ReviewRecord {
  id: string;
  listingId: string | null;
  agentId: string;
  reviewerId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface FavoriteRecord {
  id: string;
  userId: string;
  listingId: string;
  createdAt: Date;
}

export interface NotificationPreferenceRecord {
  id: string;
  userId: string;
  listingId: string;
  onPriceDrop: boolean;
  onStatusChange: boolean;
}

export interface MessageRecord {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
}

export interface MessageThreadRecord {
  id: string;
  listingId: string;
  inquiryId: string | null;
  createdAt: Date;
}

export interface NotificationEventRecord {
  id: string;
  listingId: string;
  createdById: string | null;
  eventType: string;
  payload: unknown;
  createdAt: Date;
}

export const engagementStore = {
  async createFavorite(input: { userId: string; listingId: string }): Promise<FavoriteRecord> {
    const record = await prisma.favorite.upsert({
      where: { userId_listingId: { userId: input.userId, listingId: input.listingId } },
      update: {},
      create: { userId: input.userId, listingId: input.listingId },
    });
    return {
      id: record.id,
      userId: record.userId,
      listingId: record.listingId,
      createdAt: record.createdAt,
    };
  },

  async deleteFavorite(input: { userId: string; listingId: string }): Promise<boolean> {
    const existing = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: input.userId, listingId: input.listingId } },
    });
    if (!existing) {
      return false;
    }
    await prisma.favorite.delete({ where: { id: existing.id } });
    return true;
  },

  async listFavorites(userId: string): Promise<FavoriteRecord[]> {
    const favorites = await prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return favorites.map((favorite: { id: string; userId: string; listingId: string; createdAt: Date }) => ({
      id: favorite.id,
      userId: favorite.userId,
      listingId: favorite.listingId,
      createdAt: favorite.createdAt,
    }));
  },

  async createInquiry(input: { listingId: string; buyerId: string; message: string }): Promise<InquiryRecord> {
    const listing = await prisma.propertyListing.findUnique({
      where: { id: input.listingId },
      select: { agentId: true },
    });
    if (!listing) {
      throw new Error("Listing not found.");
    }
    const result = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.inquiry.create({ data: input });
      const thread = await tx.messageThread.create({
        data: { listingId: input.listingId, inquiryId: inquiry.id },
      });
      await tx.message.create({
        data: {
          threadId: thread.id,
          senderId: input.buyerId,
          recipientId: listing.agentId,
          content: input.message,
        },
      });
      return { inquiry, thread };
    });
    return {
      id: result.inquiry.id,
      listingId: result.inquiry.listingId,
      buyerId: result.inquiry.buyerId,
      message: result.inquiry.message,
      threadId: result.thread.id,
      createdAt: result.inquiry.createdAt,
    };
  },

  async listInquiriesByListingIds(listingIds: string[]): Promise<InquiryRecord[]> {
    const inquiries = await prisma.inquiry.findMany({
      where: { listingId: { in: listingIds } },
      include: { messageThread: true },
      orderBy: { createdAt: "desc" },
    });
    return inquiries.map((inquiry) => ({
      id: inquiry.id,
      listingId: inquiry.listingId,
      buyerId: inquiry.buyerId,
      message: inquiry.message,
      threadId: inquiry.messageThread?.id ?? "",
      createdAt: inquiry.createdAt,
    }));
  },

  async respondToInquiry(input: { inquiryId: string; agentId: string; message: string }): Promise<MessageRecord> {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: input.inquiryId },
      include: { listing: { select: { agentId: true } }, messageThread: true },
    });
    if (!inquiry || inquiry.listing.agentId !== input.agentId) {
      throw new Error("Inquiry not found.");
    }

    const thread = inquiry.messageThread
      ?? await prisma.messageThread.create({
        data: { listingId: inquiry.listingId, inquiryId: inquiry.id },
      });

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: input.agentId,
        recipientId: inquiry.buyerId,
        content: input.message,
      },
    });

    return {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      createdAt: message.createdAt,
    };
  },

  async createOrUpdateTourRequest(input: {
    listingId: string;
    buyerId: string;
    preferredTime: Date;
  }): Promise<TourRequestRecord> {
    const tour = await prisma.tourRequest.create({
      data: {
        listingId: input.listingId,
        buyerId: input.buyerId,
        preferredTime: input.preferredTime,
      },
    });
    return {
      id: tour.id,
      listingId: tour.listingId,
      buyerId: tour.buyerId,
      preferredTime: tour.preferredTime,
      status: tour.status,
    };
  },

  async listToursByListingIds(listingIds: string[]): Promise<TourRequestRecord[]> {
    const tours = await prisma.tourRequest.findMany({
      where: { listingId: { in: listingIds } },
      orderBy: { createdAt: "desc" },
    });
    return tours.map((tour: { id: string; listingId: string; buyerId: string; preferredTime: Date; status: "REQUESTED" | "CONFIRMED" | "DECLINED" }) => ({
      id: tour.id,
      listingId: tour.listingId,
      buyerId: tour.buyerId,
      preferredTime: tour.preferredTime,
      status: tour.status,
    }));
  },

  async updateTourStatus(id: string, status: TourRequestRecord["status"]): Promise<TourRequestRecord | undefined> {
    const existing = await prisma.tourRequest.findUnique({ where: { id } });
    if (!existing) {
      return undefined;
    }
    const tour = await prisma.tourRequest.update({ where: { id }, data: { status } });
    return {
      id: tour.id,
      listingId: tour.listingId,
      buyerId: tour.buyerId,
      preferredTime: tour.preferredTime,
      status: tour.status,
    };
  },

  async createAgentReview(input: {
    agentId: string;
    reviewerId: string;
    rating: number;
    comment?: string;
  }): Promise<ReviewRecord> {
    const review = await prisma.review.upsert({
      where: { reviewerId_agentId: { reviewerId: input.reviewerId, agentId: input.agentId } },
      update: { rating: input.rating },
      create: { reviewerId: input.reviewerId, agentId: input.agentId, rating: input.rating },
    });
    return {
      id: review.id,
      listingId: null,
      agentId: review.agentId,
      reviewerId: review.reviewerId,
      rating: review.rating,
      comment: input.comment ?? null,
      createdAt: review.createdAt,
    };
  },

  async createListingReview(input: {
    listingId: string;
    reviewerId: string;
    rating: number;
    comment?: string;
  }): Promise<ReviewRecord> {
    const listing = await prisma.propertyListing.findUnique({
      where: { id: input.listingId },
      select: { agentId: true },
    });
    if (!listing) {
      throw new Error("Listing not found.");
    }
    const review = await prisma.propertyListingReview.upsert({
      where: { listingId_reviewerId: { listingId: input.listingId, reviewerId: input.reviewerId } },
      update: { rating: input.rating, comment: input.comment },
      create: {
        listingId: input.listingId,
        reviewerId: input.reviewerId,
        rating: input.rating,
        comment: input.comment,
      },
    });
    return {
      id: review.id,
      listingId: review.listingId,
      agentId: listing.agentId,
      reviewerId: review.reviewerId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    };
  },

  async upsertNotificationPreference(input: {
    userId: string;
    listingId: string;
    onPriceDrop: boolean;
    onStatusChange: boolean;
  }): Promise<NotificationPreferenceRecord> {
    const pref = await prisma.notificationSubscription.upsert({
      where: { userId_listingId: { userId: input.userId, listingId: input.listingId } },
      update: { onPriceDrop: input.onPriceDrop, onStatusChange: input.onStatusChange },
      create: input,
    });
    return {
      id: pref.id,
      userId: pref.userId,
      listingId: pref.listingId,
      onPriceDrop: pref.onPriceDrop,
      onStatusChange: pref.onStatusChange,
    };
  },

  async createNotificationEvent(input: {
    listingId: string;
    createdById?: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<NotificationEventRecord> {
    const event = await prisma.notificationEvent.create({
      data: {
        listingId: input.listingId,
        createdById: input.createdById,
        eventType: input.eventType,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
    return {
      id: event.id,
      listingId: event.listingId,
      createdById: event.createdById,
      eventType: event.eventType,
      payload: event.payload,
      createdAt: event.createdAt,
    };
  },

  async listNotificationEventsForUser(userId: string): Promise<NotificationEventRecord[]> {
    const subscriptions = await prisma.notificationSubscription.findMany({
      where: { userId, OR: [{ onPriceDrop: true }, { onStatusChange: true }] },
      select: { listingId: true },
    });
    const listingIds = subscriptions.map((item) => item.listingId);
    if (!listingIds.length) {
      return [];
    }
    const events = await prisma.notificationEvent.findMany({
      where: { listingId: { in: listingIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return events.map((event) => ({
      id: event.id,
      listingId: event.listingId,
      createdById: event.createdById,
      eventType: event.eventType,
      payload: event.payload,
      createdAt: event.createdAt,
    }));
  },

  async listThreadsForUser(userId: string): Promise<MessageThreadRecord[]> {
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      select: { threadId: true },
      distinct: ["threadId"],
    });
    if (!messages.length) {
      return [];
    }
    const threads = await prisma.messageThread.findMany({
      where: { id: { in: messages.map((item) => item.threadId) } },
      orderBy: { createdAt: "desc" },
    });
    return threads.map((thread) => ({
      id: thread.id,
      listingId: thread.listingId,
      inquiryId: thread.inquiryId,
      createdAt: thread.createdAt,
    }));
  },

  async listMessagesForThread(threadId: string, userId: string): Promise<MessageRecord[]> {
    const messages = await prisma.message.findMany({
      where: {
        threadId,
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: "asc" },
    });
    return messages.map((message) => ({
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      createdAt: message.createdAt,
    }));
  },

  async sendMessage(input: { threadId: string; senderId: string; content: string }): Promise<MessageRecord> {
    const thread = await prisma.messageThread.findUnique({
      where: { id: input.threadId },
      include: { inquiry: true, listing: { select: { agentId: true } } },
    });
    if (!thread) {
      throw new Error("Thread not found.");
    }

    const buyerId = thread.inquiry?.buyerId;
    if (!buyerId) {
      throw new Error("Thread is not linked to an inquiry.");
    }
    if (input.senderId !== thread.listing.agentId && input.senderId !== buyerId) {
      throw new Error("Sender is not a participant in this thread.");
    }
    const recipientId = input.senderId === buyerId ? thread.listing.agentId : buyerId;
    const message = await prisma.message.create({
      data: {
        threadId: input.threadId,
        senderId: input.senderId,
        recipientId,
        content: input.content,
      },
    });
    return {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      createdAt: message.createdAt,
    };
  },
};
