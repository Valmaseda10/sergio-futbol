"use client";

import { useParams } from "next/navigation";
import { Presentador } from "@/components/plan-partido/presentacion/presentador";

export default function PresentarPage() {
  const { partidoId } = useParams<{ partidoId: string }>();
  return <Presentador partidoId={partidoId} />;
}
