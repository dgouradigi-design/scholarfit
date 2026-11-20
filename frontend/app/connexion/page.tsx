"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthPanel from "@/components/AuthPanel";

function Page() {
  const params = useSearchParams();
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center py-6">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" />
      <AuthPanel initialMode={params.get("mode") === "inscription" ? "inscription" : "connexion"} next={params.get("next")} />
    </div>
  );
}

export default function ConnexionPage() {
  return <Suspense><Page /></Suspense>;
}
