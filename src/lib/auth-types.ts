/**
 * Type definitions for authentication system
 */

export interface TokenPayload {
  name: string;
  id: string;
  email: string;
  githubId: string | null;
  githubImageUrl: string | null;
  exp: number; // expiration timestamp (seconds since epoch)
  iat?: number; // issued at timestamp
}

export interface User {
  name: string;
  id: string;
  email: string;
  githubId: string | null;
  githubImageUrl: string | null;
}

export interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  authenticate: (code: string, state?: string | null) => Promise<void>;
  logout: () => void;
}
