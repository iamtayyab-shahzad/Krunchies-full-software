"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { setToken } from "@/lib/api-client";
import {
  TOKEN_KEY,
  isTokenExpired,
  isTillSessionValid,
} from "@/lib/utils";
import { isOnline } from "@/lib/network";
import { isLocalShopPos } from "@/lib/pos-mode";
import { authApi, sessionRepo, syncKrunchiesMenu } from "@/services/api";
import { useEffect, useState } from "react";

const schema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const localShop = isLocalShopPos();
  const [offline, setOffline] = useState(false);
  const [canContinueOffline, setCanContinueOffline] = useState(false);
  const [unlocking, setUnlocking] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const enterPos = () => {
    router.replace("/orders/new");
  };

  const finishLogin = async (token: string) => {
    setToken(token);
    try {
      await syncKrunchiesMenu();
    } catch {
      toast.warning("Logged in, but menu sync will retry on the next open.");
    }
    enterPos();
  };

  useEffect(() => {
    setOffline(!isOnline());
    const sync = () => setOffline(!navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    (async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const session = await sessionRepo.get();

        if (token && !isTokenExpired(token)) {
          enterPos();
          return;
        }

        if (
          isTillSessionValid(session, { localShop }) &&
          session?.token
        ) {
          setToken(session.token);
          setCanContinueOffline(true);
          // Local shop: never show password — reopen straight into the till.
          if (localShop) {
            enterPos();
            return;
          }
          if (!navigator.onLine) {
            enterPos();
            return;
          }
        }

        // Local: silent unlock with credentials saved after first owner login.
        if (localShop) {
          const { getShopTillCredentials } = await import("@/lib/offline-db");
          const creds = await getShopTillCredentials();
          if (creds && isOnline()) {
            try {
              const data = await authApi.login(creds);
              await finishLogin(data.token);
              return;
            } catch {
              // Fall through to one-time unlock form.
            }
          }
          if (creds && !isOnline() && session?.token) {
            setToken(session.token);
            enterPos();
            return;
          }
        }
      } finally {
        setUnlocking(false);
      }
    })();

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [router, localShop]);

  const continueOffline = async () => {
    const session = await sessionRepo.get();
    if (!isTillSessionValid(session, { localShop }) || !session?.token) {
      toast.error("No saved session found — connect once to log in");
      setCanContinueOffline(false);
      return;
    }
    setToken(session.token);
    toast.message("Continuing with offline session");
    enterPos();
  };

  const onSubmit = async (values: FormValues) => {
    if (!isOnline()) {
      if (canContinueOffline) {
        await continueOffline();
        return;
      }
      toast.error("Login requires internet.");
      return;
    }
    try {
      const data = await authApi.login(values);
      await finishLogin(data.token);
      toast.success(localShop ? "Shop unlocked" : "Logged in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  if (unlocking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <p className="text-lg font-semibold text-zinc-300">
          {localShop ? "Opening shop POS…" : "Checking session…"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-8"
      >
        <div>
          <h1 className="text-3xl font-black text-white">
            <span className="text-orange-500">Krunchies</span> POS
          </h1>
          <p className="mt-2 text-zinc-400">
            {localShop
              ? "One-time shop unlock (not needed again on this PC)"
              : "Staff login"}
          </p>
          {offline ? (
            <p className="mt-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
              Offline — use a previous session to keep selling, or reconnect to
              sign in.
            </p>
          ) : null}
          {localShop ? (
            <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              After this unlock, cashiers open the desktop shortcut with no
              password. The cloud POS link still requires a password.
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" autoFocus {...register("username")} />
          {errors.username && (
            <p className="text-sm text-red-400">{errors.username.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? localShop
              ? "Unlocking…"
              : "Signing in..."
            : localShop
              ? "Unlock this shop PC"
              : "Sign In"}
        </Button>
        {canContinueOffline ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => void continueOffline()}
          >
            Continue offline with saved session
          </Button>
        ) : null}
      </form>
    </div>
  );
}
