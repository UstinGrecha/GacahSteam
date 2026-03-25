import {
  authHasCredentials,
  authHasGoogle,
  authProvidersConfigured,
} from "@/auth";
import { RegisterView } from "./RegisterView";
import { Suspense } from "react";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500">…</div>}>
      <RegisterView
        hasGoogle={authHasGoogle()}
        hasCredentials={authHasCredentials()}
        anyProvider={authProvidersConfigured()}
      />
    </Suspense>
  );
}
