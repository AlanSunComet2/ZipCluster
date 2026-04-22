export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => Promise<void>;
}

export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async request<TResponse, TBody = unknown>(
    method: HttpMethod,
    path: string,
    body?: TBody,
  ): Promise<TResponse> {
    const execute = async (): Promise<Response> =>
      fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(this.config.getAccessToken?.()
            ? { Authorization: `Bearer ${this.config.getAccessToken?.()}` }
            : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    let response = await execute();
    if (response.status === 401 && this.config.onUnauthorized) {
      await this.config.onUnauthorized();
      response = await execute();
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `API request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  }
}
