"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ClipboardList, Crosshair } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { localDb } from "@/lib/db/local-db";

export default function PlanPartidoPage() {
  const jugadas = useLiveQuery(() => localDb.jugadas_abp.count(), [], 0);
  const hojas = useLiveQuery(() => localDb.hojas_partido.count(), [], 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Plan de partido</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/plan-partido/abp">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-start gap-3 pt-6">
              <Crosshair className="mt-0.5 size-6 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">ABP</p>
                <p className="text-sm text-muted-foreground">
                  Córners, faltas y saques de banda dibujados, con quién hace
                  cada cosa. Para imprimir o enviar en PDF.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {jugadas} {jugadas === 1 ? "jugada" : "jugadas"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/plan-partido/hoja">
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardContent className="flex items-start gap-3 pt-6">
              <ClipboardList className="mt-0.5 size-6 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Hoja de partido</p>
                <p className="text-sm text-muted-foreground">
                  Alineaciones, cambios y análisis del rival de cada partido.
                  Para imprimir o enviar en PDF.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hojas} {hojas === 1 ? "hoja" : "hojas"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
