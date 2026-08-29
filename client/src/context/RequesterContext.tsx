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

      // When server list is successfully fetched, reconcile the persisted requester
      if (currentRequester) {
        const stillActive = safeData.find((r) => r.id === currentRequester.id);
        if (!stillActive) {
          setCurrentRequesterState(null);
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setCurrentRequesterState(stillActive);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stillActive));
        }
      }
    } catch (err) {
      setRequesters([]);
      setError(err instanceof Error ? err.message : "Failed to load development requesters");
      // Preserve localStorage on transient error; the gate remains locked via isSelectorOpen
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
    // Only allow manual dismissal if a verified active requester is selected without errors
    if (currentRequester && !error && requesters.length > 0) {
      setIsSelectorOpen(false);
    }
  };

  // Lock the gate open if no requester is selected, if a fetch error occurred, or if no active requesters exist
  const isGateLockedOpen =
    isSelectorOpen ||
    !currentRequester ||
    Boolean(error) ||
    (requesters.length === 0 && !isLoading);

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        setRequester,
        requesters,
        isLoading,
        error,
        isSelectorOpen: isGateLockedOpen,
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