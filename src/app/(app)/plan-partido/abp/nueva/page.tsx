"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { JugadaAbpForm } from "@/components/plan-partido/jugada-abp-form";
import { TIPOS_ABP } from "@/lib/plan-partido";

function Contenido() {
  const tipoParam = useSearchParams().get("tipo");
  const tipo = TIPOS_ABP.find((t) => t.value === tipoParam)?.value;
  return <JugadaAbpForm tipoInicial={tipo} />;
}

export default function NuevaJugadaAbpPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nueva jugada de ABP</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
        <Contenido />
      </Suspense>
    </div>
  );
}
