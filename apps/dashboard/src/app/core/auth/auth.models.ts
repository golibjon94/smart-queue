export interface AuthUser {
  userId: number;
  username: string;
  fullName: string | null;
  role: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}
