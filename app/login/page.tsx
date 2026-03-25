import {
  authHasCredentials,
  authHasGoogle,
  authProvidersConfigured,
} from "@/auth";
import { LoginView } from "./LoginView";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500">…</div>}>
      <LoginView
        hasGoogle={authHasGoogle()}
        hasCredentials={authHasCredentials()}
        anyProvider={authProvidersConfigured()}
      />
    </Suspense>
  );
}
