"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";

export default function CampogramaPage() {
  const campogramas = useLiveQuery(
    () =>
      localDb.campogramas
        .toArray()
        .then((rows) => rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))),
    [],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Campograma</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/campograma/nuevo" />}>
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Alineaciones guardadas, con sus titulares y suplentes, para reutilizar
        y editar cuando quieras — no atadas a un partido concreto.
      </p>

      {campogramas.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay ningún campograma guardado.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {campogramas.map((c) => (
            <li key={c.id}>
              <Link
                href={`/campograma/${c.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.nombre}</p>
                  {c.notas && (
                    <p className="truncate text-xs text-muted-foreground">{c.notas}</p>
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
