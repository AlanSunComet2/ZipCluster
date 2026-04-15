import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "../auth/AuthProvider";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AgentDashboardPage } from "../pages/agent/AgentDashboardPage";
import { UserDiscoveryPage } from "../pages/user/UserDiscoveryPage";

const SESSION_KEY = "marketplace_session";

const mockJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("Role dashboard smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(window, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/admin/analytics/overview")) {
        return mockJsonResponse({
          totalUsers: 4,
          totalAgents: 2,
          totalListings: 2,
          pendingListings: 1,
          approvedListings: 1,
          soldListings: 0,
          pendingAgentApplications: 1,
          totalFavorites: 1,
        });
      }
      if (url.endsWith("/admin/agents/pending")) {
        return mockJsonResponse({ items: [{ id: "agent-2", email: "pending-agent@marketplace.local" }] });
      }
      if (url.endsWith("/admin/listings/pending")) {
        return mockJsonResponse({ items: [{ id: "seed-pending-listing", location: "Riverside" }] });
      }
      if (url.endsWith("/admin/users")) {
        return mockJsonResponse({ items: [{ id: "u1", email: "user@marketplace.local", role: "USER", isActive: true, isVerified: true }] });
      }
      if (url.endsWith("/admin/property-categories")) return mockJsonResponse({ items: [] });
      if (url.endsWith("/admin/geo-categories")) return mockJsonResponse({ items: [] });
      if (url.endsWith("/admin/cms/banners")) return mockJsonResponse({ items: [] });
      if (url.endsWith("/agents/me/listings")) return mockJsonResponse({ items: [] });
      if (url.endsWith("/agents/verification-status")) return mockJsonResponse({ status: "approved", isActive: true, applicationStatus: "APPROVED" });
      if (url.endsWith("/agents/inquiries")) return mockJsonResponse({ items: [] });
      if (url.endsWith("/agents/tour-requests")) return mockJsonResponse({ items: [] });
      if (url.includes("/listings")) return mockJsonResponse({ items: [], pagination: { page: 1, pageSize: 10, total: 0 } });
      if (url.endsWith("/users/me/favorites")) return mockJsonResponse({ items: [] });
      if (url.endsWith("/users/me/messages/threads")) return mockJsonResponse({ items: [] });
      if (url.endsWith("/users/me/notifications/events")) return mockJsonResponse({ items: [] });
      return mockJsonResponse({ items: [] });
    });
  });

  test("renders admin dashboard for admin session", async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ accessToken: "token", refreshToken: "refresh", role: "ADMIN", email: "admin@marketplace.local" }),
    );
    render(
      <AuthProvider>
        <AdminDashboardPage />
      </AuthProvider>,
    );
    expect(await screen.findByText("Admin dashboard")).toBeTruthy();
  });

  test("renders agent dashboard for agent session", async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ accessToken: "token", refreshToken: "refresh", role: "AGENT", email: "agent@marketplace.local" }),
    );
    render(
      <AuthProvider>
        <AgentDashboardPage />
      </AuthProvider>,
    );
    expect(await screen.findByText("Agent dashboard")).toBeTruthy();
  });

  test("renders user discovery for user session", async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ accessToken: "token", refreshToken: "refresh", role: "USER", email: "user@marketplace.local" }),
    );
    render(
      <AuthProvider>
        <UserDiscoveryPage />
      </AuthProvider>,
    );
    expect(await screen.findByText("User discovery")).toBeTruthy();
  });
});
