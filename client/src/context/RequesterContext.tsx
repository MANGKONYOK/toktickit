import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { RequesterUser } from "../api.js";
import { fetchRequesters } from "../api.js";

const STORAGE_KEY = "toktickit_development_requester";

interface RequesterContextType {
  currentRequester: RequesterUser | null;
  setRequester: (user: RequesterUser | null) => void;
  requesters: RequesterUser[];
  isLoading: boolean;
  error: string | null;
  isSelectorOpen: boolean;
  openSelector: () => void;
  closeSelector: () => void;
  refreshRequesters: () => Promise<void>;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: React.ReactNode }) {
  const [currentRequester, setCurrentRequesterState] = useState<RequesterUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  const refreshRequesters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRequesters();
      const safeData = Array.isArray(data) ? data : [];
      setRequesters(safeData);

      // If stored requester is no longer in active list, clear it
      if (currentRequester && safeData.length > 0) {
        const stillActive = safeData.find((r) => r.id === currentRequester.id);
        if (!stillActive) {
          setCurrentRequesterState(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      setRequesters([]);
      setError(err instanceof Error ? err.message : "Failed to load development requesters");
    } finally {
      setIsLoading(false);
    }
  }, [currentRequester]);

  useEffect(() => {
    refreshRequesters();
  }, []);

  const setRequester = (user: RequesterUser | null) => {
    setCurrentRequesterState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setIsSelectorOpen(false);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsSelectorOpen(true);
    }
  };

  const openSelector = () => setIsSelectorOpen(true);
  const closeSelector = () => {
    if (currentRequester) {
      setIsSelectorOpen(false);
    }
  };

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        setRequester,
        requesters,
        isLoading,
        error,
        isSelectorOpen: isSelectorOpen || !currentRequester,
        openSelector,
        closeSelector,
        refreshRequesters,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester() {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}