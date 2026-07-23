"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setToken } from "@/lib/api-client";
import { TOKEN_KEY, isTokenExpired } from "@/lib/utils";
import { authApi, syncKrunchiesMenu } from "@/services/api";
import { useEffect } from "react";

const schema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !isTokenExpired(token)) router.replace("/orders/new");
    else if (token) localStorage.removeItem(TOKEN_KEY);
  }, [router]);

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await authApi.login(values);
      setToken(data.token);
      try {
        await syncKrunchiesMenu();
      } catch {
        toast.warning("Logged in, but menu sync will retry on the next login.");
      }
      toast.success("Logged in");
      router.replace("/orders/new");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

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
          <p className="mt-2 text-zinc-400">Staff login</p>
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
          <Input id="password" type="password" {...register("password")} />
          {errors.password && (
            <p className="text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">
          <p>
            Staff: <span className="text-zinc-200">staff / staff123</span>
          </p>
          <p className="mt-1">
            Admin: <span className="text-zinc-200">admin / admin123</span>
          </p>
        </div>
      </form>
    </div>
  );
}
