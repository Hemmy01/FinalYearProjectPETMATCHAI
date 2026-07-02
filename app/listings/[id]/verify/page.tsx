"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OldVerifyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/profile/verify"); }, [router]);
  return null;
}
