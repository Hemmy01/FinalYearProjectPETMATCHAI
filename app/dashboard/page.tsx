"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const dashboardMap = {
  buyer: "/dashboard/buyer",
  seller: "/dashboard/seller",
  administrator: "/dashboard/admin",
};

export default function DashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(dashboardMap[user.role]);
      return;
    }
    // Context user can be briefly null right after sign-in while the session
    // propagates. Verify the real session before bouncing to login so a
    // freshly-authenticated user isn't kicked out.
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && !session) router.replace("/auth/login");
    });
    return () => { active = false; };
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-indigo-600" />
    </div>
  );
}
