"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"];

function checkStrength(val: string) {
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  return s;
}

function ResetPasswordInner() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"waiting" | "ready" | "done" | "error">("waiting");
  const [error, setError] = useState("");
  const resolvedRef = useRef(false);

  function markReady() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setStatus("ready");
  }

  function markError(msg: string) {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setError(msg);
    setStatus("error");
  }

  useEffect(() => {
    // OTP flow: verifyOtp() on forgot-password page establishes the recovery session,
    // then redirects here. Session is already in storage — just check for it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        markReady();
        return;
      }
      if (event === "INITIAL_SESSION" && session) {
        markReady();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    const timeout = setTimeout(() => {
      markError("Session expired or not found. Please request a new reset code.");
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (strength < 2) { setError("Please use a stronger password (at least 8 characters with a number or symbol)."); return; }
    setError("");
    setLoading(true);

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Sign out the recovery session — user must log in fresh with the new password
    await supabase.auth.signOut();
    setLoading(false);
    setStatus("done");
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p className="text-sm text-gray-500 mt-1">Create a new secure password for your account</p>
          </div>

          {status === "waiting" && (
            <div className="text-center py-6">
              <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Setting up secure session…</p>
              <p className="text-xs text-gray-400 mt-2">Please wait a moment.</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-3 rounded-xl">{error}</p>
              <Link href="/auth/forgot-password"
                className="block w-full text-center bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700">
                Request New Reset Link
              </Link>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} required value={password}
                    onChange={(e) => { setPassword(e.target.value); setStrength(checkStrength(e.target.value)); }}
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {strength > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor[strength] : "bg-gray-200"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">Strength: <span className="font-medium">{strengthLabel[strength]}</span></p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input type={showCf ? "text" : "password"} required value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10 ${
                      confirm && confirm !== password ? "border-red-400" : "border-gray-300"
                    }`} />
                  <button type="button" onClick={() => setShowCf(!showCf)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                    {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm && confirm !== password && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Resetting…" : "Set New Password"}
              </button>
            </form>
          )}

          {status === "done" && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm font-semibold text-green-800">Password changed successfully!</p>
                <p className="text-xs text-green-700 mt-1">You have been signed out. Please log in with your new password.</p>
              </div>
              <button onClick={() => router.push("/auth/login")}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700">
                Go to Login
              </button>
            </div>
          )}

          {status !== "done" && (
            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              <Link href="/auth/login" className="text-sm text-gray-400 hover:text-gray-600">← Back to login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordInner />;
}
