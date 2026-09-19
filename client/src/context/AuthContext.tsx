import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthUser } from "../types/auth.js";
import { loginApi, logoutApi, getMeApi, changePasswordApi } from "../api.js";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const data = await getMeApi();
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const data = await loginApi(credentials);
    if (data && data.user) {
      setUser(data.user);
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
    }
  };

  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    await changePasswordApi(payload);
    if (user) {
      setUser({ ...user, mustChangePassword: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      login: async () => {},
      logout: async () => {},
      changePassword: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}
