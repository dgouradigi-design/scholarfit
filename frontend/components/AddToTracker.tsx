"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useT } from "./LangProvider";

export default function AddToTracker({ scholarshipId }: { scholarshipId: number }) {
  const { t } = useT();
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
      {state === "done" ? `✓ ${t("Dans mon suivi")}` : state === "error" ? t("Réessayer") : t("Ajouter au suivi")}
    </button>
  );
}
