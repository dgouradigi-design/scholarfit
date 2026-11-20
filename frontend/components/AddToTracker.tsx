"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function AddToTracker({ scholarshipId }: { scholarshipId: number }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <button
      className="btn-ghost px-4 py-2 text-xs"
      disabled={state === "busy" || state === "done"}
      onClick={async () => {
        setState("busy");
        try {
          await api("/api/applications", { method: "POST", body: JSON.stringify({ scholarship_id: scholarshipId }) });
          setState("done");
        } catch {
          setState("error");
        }
      }}
    >
      {state === "done" ? "✓ Dans mon suivi" : state === "error" ? "Réessayer" : "Ajouter au suivi"}
    </button>
  );
}
