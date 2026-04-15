import { useMemo } from "react";
import { ApiClient } from "../api/client";
import { env } from "../config/env";
import { useAuth } from "./AuthProvider";

export const useApiClient = (): ApiClient => {
  const { session, logout, refreshSession } = useAuth();

  return useMemo(
    () =>
      new ApiClient({
        baseUrl: env.apiBaseUrl,
        getAccessToken: () => session?.accessToken ?? null,
        onUnauthorized: async () => {
          try {
            await refreshSession();
          } catch (_error: unknown) {
            logout();
          }
        },
      }),
    [session, logout, refreshSession],
  );
};
