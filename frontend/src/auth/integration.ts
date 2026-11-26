/** Future memory-only session bridge. No storage or session implementation here. */
export interface AuthenticationAdapter {
  getAccessToken(): string | null;
  onProtectedUnauthorized?(): void | Promise<void>;
}
