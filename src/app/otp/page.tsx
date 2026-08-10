"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function OtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem("server-monitoring-pending-email");
    if (!pendingEmail) {
      router.replace("/");
      return;
    }
    setEmail(pendingEmail);
  }, [router]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);

    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;

    const next = text.split("").concat(Array(6 - text.length).fill(""));
    setOtp(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length !== 6) {
      toast.error("Please enter the 6-digit OTP.");
      return;
    }

    setIsLoading(true);

    // TODO: Replace with actual OTP verification backend call.
    console.log("OTP payload:", { email, otp: code });
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (code !== "135165") {
      toast.error("Invalid OTP. Please try again.");
      setIsLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "server-monitoring-session",
        JSON.stringify({ email, authenticatedAt: Date.now() })
      );
      sessionStorage.removeItem("server-monitoring-pending-email");
    }

    toast.success("OTP verified. Please connect to a server.");
    router.push("/admin/connect");
    setIsLoading(false);
  };

  const handleBack = () => {
    sessionStorage.removeItem("server-monitoring-pending-email");
    router.replace("/");
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-6 text-foreground font-[family-name:var(--font-geist-sans)]">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[36rem] w-[36rem] rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-400/10" />
      </div>
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/10" />

      <main className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/80 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/70 sm:p-10">
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </button>

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Verify OTP
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit code sent to{" "}
            <span className="font-semibold text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                required
                className="h-12 w-12 rounded-xl border border-gray-200 bg-white/50 text-center text-xl font-bold outline-none transition-all placeholder:text-gray-300 focus:border-foreground focus:ring-4 focus:ring-foreground/10 dark:border-white/10 dark:bg-white/5 sm:h-14 sm:w-14 sm:text-2xl"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join("").length !== 6}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-sm font-semibold text-background shadow-lg shadow-foreground/20 outline-none transition-all hover:-translate-y-0.5 hover:bg-[#383838] hover:shadow-xl hover:shadow-foreground/25 focus:ring-4 focus:ring-foreground/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                Verifying...
              </span>
            ) : (
              "Verify"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
