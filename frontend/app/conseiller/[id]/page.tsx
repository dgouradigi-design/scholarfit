"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import CoachingWorkspace from "@/components/CoachingWorkspace";
import RequireAuth from "@/components/RequireAuth";

export default function SuiviConseillerPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <div className="space-y-4">
        <Link href="/conseiller" className="text-sm text-brand hover:underline">← Tous mes candidats</Link>
        <CoachingWorkspace id={Number(id)} />
      </div>
    </RequireAuth>
  );
}
