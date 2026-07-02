"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep("code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.join("");
    if (token.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
    setLoading(false);
    if (err) {
      setError("Invalid or expired code. Please check your email and try again.");
      return;
    }
    // OTP verified — session is now established; go to the reset form
    router.push("/auth/reset-password");
  }

  function handleCodeInput(index: number, value: string) {
    // Accept only digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    // Auto-advance
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...code];
    pasted.split("").forEach((d, i) => { next[i] = d; });
    setCode(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound size={28} className="text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === "email" ? "Forgot password?" : "Check your email"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {step === "email"
                ? "Enter your email and we'll send you a reset code"
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Sending…" : "Send Reset Code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Enter the 6-digit code from your email
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">You can paste the code directly</p>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg text-center">{error}</p>}

              <button type="submit" disabled={loading || code.join("").length < 6}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Verifying…" : "Verify Code"}
              </button>

              <div className="text-center space-y-2">
                <button type="button" onClick={() => { setStep("email"); setCode(["","","","","",""]); setError(""); }}
                  className="text-sm text-gray-400 hover:text-gray-600">
                  ← Use a different email
                </button>
                <br />
                <button type="button" disabled={loading} onClick={async () => {
                  setError(""); setLoading(true);
                  await supabase.auth.resetPasswordForEmail(email);
                  setLoading(false);
                  setCode(["","","","","",""]);
                }}
                  className="text-sm text-indigo-600 hover:underline disabled:opacity-50">
                  Resend code
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <Link href="/auth/login" className="text-sm text-gray-400 hover:text-gray-600">← Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
