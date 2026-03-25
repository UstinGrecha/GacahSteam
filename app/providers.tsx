"use client";

import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { StorageProvider } from "@/components/StorageProvider";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <StorageProvider>
        <I18nProvider>{children}</I18nProvider>
      </StorageProvider>
    </AuthSessionProvider>
  );
}
