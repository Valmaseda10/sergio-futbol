"use client";

import { useParams } from "next/navigation";
import { PresentacionEditor } from "@/components/plan-partido/presentacion/presentacion-editor";

export default function PresentacionPartidoPage() {
  const { partidoId } = useParams<{ partidoId: string }>();
  return <PresentacionEditor partidoId={partidoId} />;
}
