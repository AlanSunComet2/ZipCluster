import { createContext, useContext, useCallback, useMemo, useState } from "react";
import { createAuthApi } from "../api/auth";
import { ApiClient } from "../api/client";
import type { AuthResponse, LoginInput, RegisterInput, UserRole } from "../api/contracts";
import { env } from "../config/env";

interface SessionState {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  email: string;
}

interface AuthContextValue {
  session: SessionState | null;
  login: (payload: LoginInput) => Promise<void>;
  register: (payload: RegisterInput) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = "marketplace_session";

const readSession = (): SessionState | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as SessionState;
};

const writeSession = (session: SessionState | null): void => {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const toSession = (response: AuthResponse): SessionState => ({
  accessToken: response.tokens.accessToken,
  refreshToken: response.tokens.refreshToken,
  role: response.user.role,
  email: response.user.email,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const [session, setSession] = useState<SessionState | null>(() => readSession());

  const authClient = useMemo(
    () =>
      new ApiClient({
        baseUrl: env.apiBaseUrl,
      }),
    [],
  );
  const authApi = useMemo(() => createAuthApi(authClient), [authClient]);

  const save = useCallback((next: SessionState | null): void => {
    setSession(next);
    writeSession(next);
  }, []);

  const login = useCallback(async (payload: LoginInput): Promise<void> => {
    const response = await authApi.login(payload);
    save(toSession(response));
  }, [authApi]);

  const register = useCallback(async (payload: RegisterInput): Promise<void> => {
    const response = await authApi.register(payload);
    save(toSession(response));
  }, [authApi]);

  const logout = useCallback((): void => {
    save(null);
  }, []); // save is stable (defined outside component or also memoized)

  const refreshSession = useCallback(async (): Promise<void> => {
    if (!session?.refreshToken) {
      logout();
      return;
    }
    const refreshed = await authApi.refresh({ refreshToken: session.refreshToken });
    save({ ...session, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken });
  }, [session, authApi, logout]);

  // Fixed the useMemo deps to include ALL functions
  const value = useMemo<AuthContextValue>(
    () => ({ session, login, register, refreshSession, logout }),
    [session, login, register, refreshSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return ctx;
};
