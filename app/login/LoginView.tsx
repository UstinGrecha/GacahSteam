"use client";

import { useI18n } from "@/components/I18nProvider";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

type Props = {
  hasGoogle: boolean;
  hasCredentials: boolean;
  anyProvider: boolean;
};

export function LoginView({ hasGoogle, hasCredentials, anyProvider }: Props) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = useCallback(() => {
    setError(null);
    void signIn("google", { callbackUrl });
  }, [callbackUrl]);

  const onCredentials = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!email.trim() || !password) return;
      setPending(true);
      try {
        const r = await signIn("credentials", {
          email: email.trim(),
          password,
          callbackUrl,
          redirect: false,
        });
        if (r?.error) {
          setError(t("auth.errorGeneric"));
        } else if (r?.url) {
          window.location.href = r.url;
        }
      } catch {
        setError(t("auth.errorGeneric"));
      } finally {
        setPending(false);
      }
    },
    [email, password, callbackUrl, t],
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">{t("auth.title")}</h1>
      </div>

      {!anyProvider ? (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200/90">
          {t("auth.errorNoProviders")}
        </p>
      ) : null}

      {hasGoogle ? (
        <button
          type="button"
          onClick={onGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("auth.signInGoogle")}
        </button>
      ) : null}

      {hasCredentials ? (
        <form onSubmit={onCredentials} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-300">{t("auth.emailLabel")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:min-h-0 sm:text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-300">
              {t("auth.passwordLabel")}
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:min-h-0 sm:text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {t("auth.signInSubmit")}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200/90">
          {error}
        </p>
      ) : null}

      {hasCredentials || hasGoogle ? (
        <p className="text-center text-sm text-zinc-500">
          <Link
            href="/register"
            className="font-medium text-sky-400 hover:text-sky-300"
          >
            {t("auth.needAccount")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
