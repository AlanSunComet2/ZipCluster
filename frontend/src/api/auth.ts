import type {
  AuthResponse,
  ChangePasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
} from "./contracts";
import { ApiClient } from "./client";

export const createAuthApi = (client: ApiClient) => ({
  register: (payload: RegisterInput): Promise<AuthResponse> =>
    client.request<AuthResponse, RegisterInput>("POST", "/auth/register", payload),
  login: (payload: LoginInput): Promise<AuthResponse> =>
    client.request<AuthResponse, LoginInput>("POST", "/auth/login", payload),
  refresh: (payload: RefreshInput): Promise<{ accessToken: string; refreshToken: string }> =>
    client.request<{ accessToken: string; refreshToken: string }, RefreshInput>(
      "POST",
      "/auth/refresh",
      payload,
    ),
  changePassword: (payload: ChangePasswordInput): Promise<{ message: string }> =>
    client.request<{ message: string }, ChangePasswordInput>(
      "POST",
      "/auth/change-password",
      payload,
    ),
});
