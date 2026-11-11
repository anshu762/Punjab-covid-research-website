"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AuthModal } from "./AuthModal";

interface AuthModalContextType {
  openAuthModal: (mode?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  isOpen: boolean;
  mode: "signin" | "signup";
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const openAuthModal = useCallback((initialMode: "signin" | "signup" = "signin") => {
    setMode(initialMode);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal, isOpen, mode }}>
      {children}
      <AuthModal isOpen={isOpen} onClose={closeAuthModal} initialMode={mode} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
