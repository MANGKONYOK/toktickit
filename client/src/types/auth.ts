export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMIN";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  mustChangePassword: boolean;
  department?: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  correlationId?: string;
}
