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
import { TOKEN_KEY } from "@/lib/utils";
import { authApi } from "@/services/api";
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
    if (localStorage.getItem(TOKEN_KEY)) router.replace("/orders/new");
  }, [router]);

  const onSubmit = async (values: FormValues) => {
    // #region agent log
    fetch('http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5f52e'},body:JSON.stringify({sessionId:'b5f52e',runId:'pre-fix',hypothesisId:'C',location:'login/page.tsx:onSubmit',message:'Login submit clicked',data:{username:values.username,hasPassword:Boolean(values.password),href:typeof window!=='undefined'?window.location.href:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      const data = await authApi.login(values);
      // #region agent log
      fetch('http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5f52e'},body:JSON.stringify({sessionId:'b5f52e',runId:'pre-fix',hypothesisId:'D',location:'login/page.tsx:success',message:'Login succeeded',data:{hasToken:Boolean(data?.token)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setToken(data.token);
      toast.success("Logged in");
      router.replace("/orders/new");
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7291/ingest/db8772f4-e46c-4a12-90e5-d51373bf23e5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5f52e'},body:JSON.stringify({sessionId:'b5f52e',runId:'pre-fix',hypothesisId:'A',location:'login/page.tsx:error',message:'Login failed',data:{errorMessage:err instanceof Error ? err.message : String(err)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
      </form>
    </div>
  );
}
