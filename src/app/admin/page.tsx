"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CONNECTION_KEY } from "@/lib/connection";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const connection = sessionStorage.getItem(CONNECTION_KEY);
    if (connection) {
      router.replace("/admin/container");
    } else {
      router.replace("/admin/connect");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
    </div>
  );
}
