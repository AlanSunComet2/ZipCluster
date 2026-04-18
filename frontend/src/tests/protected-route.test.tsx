import { describe, expect, test, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AuthProvider } from "../auth/AuthProvider";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("redirects to login when session is missing", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ProtectedRoute>
              <div>private-content</div>
            </ProtectedRoute>
          ),
        },
        { path: "/login", element: <div>login-page</div> },
      ],
      { initialEntries: ["/"] },
    );

    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>,
    );

    expect(await screen.findByText("login-page")).toBeTruthy();
  });
});
