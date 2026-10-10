"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AbpHojas } from "@/components/plan-partido/abp-hojas";
import { TIPOS_ABP } from "@/lib/plan-partido";

function Contenido() {
  const tipoParam = useSearchParams().get("tipo");
  const tipo = TIPOS_ABP.find((t) => t.value === tipoParam)?.value;
  return (
    <div className="space-y-3">
      <div className="print:hidden">
        <Link
          href="/plan-partido/abp"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          ABP
        </Link>
        <h1 className="text-2xl font-semibold">
          Imprimir ABP{tipo ? ` · ${TIPOS_ABP.find((t) => t.value === tipo)?.plural}` : ""}
        </h1>
      </div>
      <AbpHojas tipo={tipo} />
    </div>
  );
}

export default function ImprimirAbpPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
      <Contenido />
    </Suspense>
  );
}
