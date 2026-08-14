"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ScoutingPage() {
  const rivales = useLiveQuery(
    () =>
      localDb.rivales_scouting
        .toArray()
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});

  const rutasFoto = rivales.map((r) => r.foto_url).filter((v): v is string => !!v);
  const rutasFotoKey = rutasFoto.join(",");

  useEffect(() => {
    if (rutasFoto.length === 0 || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("adjuntos")
      .createSignedUrls(rutasFoto, 3600)
      .then(({ data }) => {
        if (!data) return;
        setFotoUrls((prev) => {
          const next = { ...prev };
          for (const d of data) {
            if (d.signedUrl && d.path) next[d.path] = d.signedUrl;
          }
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutasFotoKey]);

  return (
    <div className="space-y-4">
      <Link
        href="/partidos"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a partidos
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Scouting</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/partidos/scouting/nuevo" />}
        >
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      {rivales.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay rivales analizados.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {rivales.map((r) => (
            <li key={r.id}>
              <Link
                href={`/partidos/scouting/${r.id}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                {r.foto_url && fotoUrls[r.foto_url] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoUrls[r.foto_url]}
                    alt={r.nombre}
                    className="size-10 shrink-0 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-xs text-muted-foreground">
                    {r.nombre.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {r.nombre}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
