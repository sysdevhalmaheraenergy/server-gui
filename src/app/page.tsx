"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

interface LoginFormData {
  email: string;
  password: string;
}

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      toast.error("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    // TODO: Replace with actual email/password authentication backend call.
    console.log("Login payload:", { email, password });
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (
      email !== "sysdev@halmaheraenergy.com" ||
      password !== "Password123@"
    ) {
      toast.error("Invalid email or password.");
      setIsLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("server-monitoring-pending-email", email);
    }

    toast.success("Sign in successful. Please verify OTP.");
    router.push("/otp");
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-6 text-foreground font-[family-name:var(--font-geist-sans)]">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[36rem] w-[36rem] rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-400/10" />
      </div>
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/10" />

      <main className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/70 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Server Monitoring
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access your admin dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-gray-200 bg-white/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-foreground focus:ring-4 focus:ring-foreground/10 dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-gray-200 bg-white/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-foreground focus:ring-4 focus:ring-foreground/10 dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background shadow-lg shadow-foreground/20 outline-none transition-all hover:-translate-y-0.5 hover:bg-[#383838] hover:shadow-xl hover:shadow-foreground/25 focus:ring-4 focus:ring-foreground/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
