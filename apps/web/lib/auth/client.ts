/**
 * Entity Auth API client
 */
import type { AuthResponse, SSOStartResponse } from "./types";

export class EntityAuthClient {
  private baseURL: string;
  private workspaceTenantId: string;

  constructor(baseURL: string, workspaceTenantId: string) {
    this.baseURL = baseURL;
    this.workspaceTenantId = workspaceTenantId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.message || error.error || `Request failed: ${response.status}`,
      );
    }

    return response.json();
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      headers: {
        "x-refresh-token": refreshToken,
      },
    });
  }

  async logout(accessToken: string): Promise<void> {
    await this.request("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async startSSO(
    provider: "google" | "microsoft",
    returnTo?: string,
  ): Promise<SSOStartResponse> {
    const finalReturnTo = returnTo || `${window.location.origin}/auth/callback`;
    return this.request<SSOStartResponse>("/api/auth/sso/start", {
      method: "POST",
      body: JSON.stringify({
        provider,
        returnTo: finalReturnTo,
        workspaceTenantId: this.workspaceTenantId,
      }),
    });
  }

  async exchangeTicket(ticket: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/sso/exchange-ticket", {
      method: "POST",
      body: JSON.stringify({
        ticket,
        workspaceTenantId: this.workspaceTenantId,
      }),
    });
  }
}

// Environment configuration
const ENTITY_AUTH_URL =
  process.env.NEXT_PUBLIC_ENTITY_AUTH_URL ||
  "https://entityy-entity-auth.vercel.app";
const WORKSPACE_TENANT_ID =
  process.env.NEXT_PUBLIC_ENTITY_AUTH_WORKSPACE_TENANT_ID || "";

// Singleton client instance
export const entityAuthClient = new EntityAuthClient(
  ENTITY_AUTH_URL,
  WORKSPACE_TENANT_ID,
);
