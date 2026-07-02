"use client";
import Link from "next/link";
import { Suspense, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

function ConfirmEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Try to get email from URL param first, then sessionStorage
    const urlEmail = searchParams.get("email");
    const stored = sessionStorage.getItem("pending_email");
    setEmail(urlEmail ?? stored ?? "");
  }, [searchParams]);

  function handleChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputs.current[5]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit code."); return; }
    if (!email) { setError("Email address is required. Please enter your email below."); return; }
    setError("");
    setLoading(true);

    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    sessionStorage.removeItem("pending_email");
    router.push("/dashboard");
  }

  async function handleResend() {
    if (!email) { setError("Enter your email address below first."); return; }
    setResending(true);
    await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MailCheck size={32} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 mb-1">We sent a 6-digit verification code to</p>
          <p className="text-sm font-semibold text-gray-800 mb-6">{email || "your email address"}</p>

          <form onSubmit={handleVerify}>
            <div className="flex justify-center gap-2 sm:gap-3 mb-4" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors ${
                    digit ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-300 focus:border-indigo-400"
                  }`}
                />
              ))}
            </div>

            {/* Email field — shown if not auto-populated */}
            {!email && (
              <div className="mb-4 text-left">
                <label className="block text-xs font-medium text-gray-600 mb-1">Your email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}

            {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 mb-4">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <p className="text-sm text-gray-500">
            Didn&apos;t receive it?{" "}
            <button onClick={handleResend} disabled={resending}
              className="text-indigo-600 font-medium hover:underline disabled:opacity-50">
              {resending ? "Sending…" : resent ? "✓ Code resent!" : "Resend code"}
            </button>
          </p>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link href="/auth/login" className="text-sm text-gray-400 hover:text-gray-600">← Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-600" /></div>}>
      <ConfirmEmailInner />
    </Suspense>
  );
}
