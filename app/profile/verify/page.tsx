"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, CheckCircle, Camera, AlertCircle, Upload, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";

const ID_TYPES = [
  { value: "national_id",      label: "National ID Card (NIN)",        desc: "Your NIMC slip or NIN card" },
  { value: "passport",         label: "International Passport",         desc: "Data page with photo and details" },
  { value: "drivers_license",  label: "Driver's License",               desc: "Front face of your licence" },
  { value: "cac_certificate",  label: "CAC Certificate (Businesses)",   desc: "For pet stores / breeders registered with CAC" },
];

export default function VerifyIdentityPage() {
  const { user, loading: authLoading } = useAuth();

  const [existing, setExisting] = useState<{ status: string; id_type: string; admin_note?: string } | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [idType, setIdType] = useState("national_id");
  const [idImageUrl, setIdImageUrl] = useState<string | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"id" | "selfie" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get("/api/verify").then((res) => {
      setExisting(res.data ?? null);
      setPageLoading(false);
    });
  }, [user]);

  async function uploadFile(file: File, field: "id" | "selfie") {
    setError("");
    setUploading(field);
    const { data: { session } } = await supabase.auth.getSession();
    const form = new FormData();
    form.append("file", file);
    form.append("bucket", "verification-photos");
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: form,
    });
    setUploading(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Upload failed. Try again.");
      return;
    }
    const json = await res.json();
    if (field === "id") {
      setIdImageUrl(json.url);
      setIdPreview(URL.createObjectURL(file));
    } else {
      setSelfieUrl(json.url);
      setSelfiePreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit() {
    if (!idImageUrl) { setError("Please upload your ID document photo."); return; }
    setError("");
    setSubmitting(true);
    const res = await api.post("/api/verify", { idType, idImageUrl, selfieUrl });
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    setSubmitted(true);
  }

  if (authLoading || pageLoading) {
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-600" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-4xl mb-3">🔒</div>
        <Link href="/auth/login" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">Sign In</Link>
      </div>
    );
  }

  // Already verified
  if (user.is_verified) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re a Verified Seller</h2>
        <p className="text-sm text-gray-500 mb-2">Your identity has been confirmed. All your listings now show the <strong>Verified Seller</strong> badge to buyers.</p>
        <Link href="/dashboard/seller" className="inline-block mt-4 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
          Back to Dashboard →
        </Link>
      </div>
    );
  }

  // Submitted and pending
  if (submitted || existing?.status === "pending") {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} className="text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Under Review</h2>
        <p className="text-sm text-gray-500 mb-2">Our team is reviewing your document. This usually takes 24–48 hours. You'll receive a notification once it's processed.</p>
        <p className="text-xs text-gray-400 mb-6">Your listings are live now. The Verified Seller badge will appear automatically once approved.</p>
        <Link href="/dashboard/seller" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
          Back to Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldCheck size={28} className="text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Verify Your Identity</h1>
        <p className="text-sm text-gray-500 mt-1">Verified sellers get a badge on all their listings, building buyer trust</p>
      </div>

      {/* What you get */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-indigo-900 mb-2">What verification gives you:</p>
        <ul className="space-y-1.5">
          {[
            "Verified Seller badge on every listing you post",
            "Higher buyer trust — buyers can filter for verified sellers",
            "One-time process — verify once, all listings benefit forever",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-indigo-700">
              <CheckCircle size={13} className="shrink-0 mt-0.5 text-indigo-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Previous rejection */}
      {existing?.status === "rejected" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Previous submission rejected</p>
            {existing.admin_note && <p className="text-xs text-red-600 mt-0.5">Reason: {existing.admin_note}</p>}
            <p className="text-xs text-red-500 mt-1">Please resubmit with a clearer document photo.</p>
          </div>
        </div>
      )}

      {/* Step 1 — ID type */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">1</span>
          Choose your ID type
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ID_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setIdType(t.value)}
              className={`text-left p-3 rounded-xl border-2 transition-colors ${
                idType === t.value
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className={`text-xs font-semibold ${idType === t.value ? "text-indigo-700" : "text-gray-800"}`}>{t.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — ID document photo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <p className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">2</span>
          Upload your ID document photo
        </p>
        <p className="text-xs text-gray-400 mb-3 ml-7">Make sure all text and photo on the document are clearly visible. Max 10 MB.</p>

        {!idPreview ? (
          <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
            <Upload size={24} className="text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">Click to upload ID photo</p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "id"); }} />
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            <img src={idPreview} alt="ID document" className={`w-full max-h-52 object-contain bg-gray-50 ${uploading === "id" ? "opacity-60" : ""}`} />
            {uploading === "id" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-white rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium">
                  <Loader2 size={16} className="animate-spin text-indigo-600" /> Uploading…
                </div>
              </div>
            )}
            {idImageUrl && <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1"><CheckCircle size={11} /> Uploaded</div>}
          </div>
        )}
        {idPreview && !uploading && (
          <button onClick={() => { setIdPreview(null); setIdImageUrl(null); }}
            className="text-xs text-gray-400 hover:text-red-500 mt-2 underline">
            Choose a different photo
          </button>
        )}
      </div>

      {/* Step 3 — Selfie (optional) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <p className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <span className="w-5 h-5 bg-gray-300 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">3</span>
          Selfie holding your ID <span className="text-xs font-normal text-gray-400 ml-1">(optional but speeds up approval)</span>
        </p>
        <p className="text-xs text-gray-400 mb-3 ml-7">A photo of you holding the document next to your face confirms it belongs to you.</p>

        {!selfiePreview ? (
          <label className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
            <User size={22} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Click to upload selfie (optional)</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "selfie"); }} />
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            <img src={selfiePreview} alt="Selfie" className={`w-full max-h-48 object-contain bg-gray-50 ${uploading === "selfie" ? "opacity-60" : ""}`} />
            {uploading === "selfie" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 text-sm"><Loader2 size={14} className="animate-spin text-indigo-600" /> Uploading…</div>
              </div>
            )}
            {selfieUrl && <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1"><CheckCircle size={11} /> Uploaded</div>}
          </div>
        )}
        {selfiePreview && !uploading && (
          <button onClick={() => { setSelfiePreview(null); setSelfieUrl(null); }}
            className="text-xs text-gray-400 hover:text-red-500 mt-2 underline">
            Remove selfie
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      <div className="flex gap-3">
        <Link href="/dashboard/seller"
          className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={!idImageUrl || submitting || uploading !== null}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {submitting ? "Submitting…" : "Submit for Verification"}
        </button>
      </div>

      <p className="text-xs text-center text-gray-400 mt-4">
        Your documents are stored securely and only reviewed by our admin team. They are never shared with buyers.
      </p>
    </div>
  );
}
