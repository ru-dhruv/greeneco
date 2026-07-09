"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Leaf, Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/feed");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 flex flex-col justify-center items-center">
      <div className="p-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 animate-pulse mb-6">
        <Leaf className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-800 tracking-tight">GreenCred</h1>
      <p className="text-gray-500 mt-2">Loading your eco-world...</p>
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mt-6" />
    </div>
  );
}
