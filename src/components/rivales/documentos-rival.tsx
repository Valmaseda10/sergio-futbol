"use client";

// Hojas de partido (u otros PDF/fotos) subidas a mano con lo apuntado
// durante los partidos jugados contra este rival. A diferencia de la foto
// del rival (un único campo), aquí puede haber varias — ida/vuelta,
// distintas competiciones — así que se listan con su propio nombre.

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { FileText, ExternalLink, Trash2, Plus, Loader2 } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import {
  subirDocumentoRivalLocal,
  eliminarDocumentoRivalLocal,
} from "@/app/(app)/rivales/local-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DocumentosRival({ rivalId }: { rivalId: string }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentos = useLiveQuery(
    () =>
      localDb.rivales_documentos
        .where("rival_id")
        .equals(rivalId)
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => b.created_at.localeCompare(a.created_at)),
        ),
    [rivalId],
    [],
  );

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (documentos.length === 0 || !navigator.onLine) return;
    const supabase = createClient();
    Promise.all(
      documentos.map((d) =>
        supabase.storage
          .from("adjuntos")
          .createSignedUrl(d.archivo_url, 3600)
          .then(({ data }) => [d.id, data?.signedUrl ?? null] as const),
      ),
    ).then((pares) => {
      setSignedUrls(
        Object.fromEntries(pares.filter(([, url]) => url != null)) as Record<
          string,
          string
        >,
      );
    });
  }, [documentos]);

  function handleElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setArchivo(file);
    if (file && !nombre.trim()) {
      setNombre(file.name.replace(/\.pdf$/i, ""));
    }
  }

  async function handleSubir() {
    if (!archivo) {
      toast.error("Elige un archivo PDF");
      return;
    }
    setSubiendo(true);
    const result = await subirDocumentoRivalLocal(rivalId, nombre, archivo);
    setSubiendo(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Documento subido");
    setNombre("");
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMostrarForm(false);
  }

  async function handleBorrar(id: string) {
    setBorrandoId(id);
    await eliminarDocumentoRivalLocal(id);
    setBorrandoId(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Hojas de partido y otros documentos de los partidos jugados.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="print:hidden"
          onClick={() => setMostrarForm((v) => !v)}
        >
          <Plus className="size-4" />
          Subir
        </Button>
      </div>

      {mostrarForm && (
        <div className="space-y-3 rounded-md border p-3 print:hidden">
          <div className="space-y-1">
            <Label htmlFor="documento-nombre" className="text-xs">
              Nombre
            </Label>
            <Input
              id="documento-nombre"
              placeholder="Ej. Jornada 5 — hoja de partido"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Archivo</Label>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={subiendo}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="size-4" />
                {archivo ? archivo.name : "Elegir PDF"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleElegirArchivo}
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={subiendo || !archivo}
            onClick={handleSubir}
          >
            {subiendo ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {subiendo ? "Subiendo..." : "Guardar documento"}
          </Button>
        </div>
      )}

      {documentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay documentos subidos.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {signedUrls[d.id] ? (
                  <a
                    href={signedUrls[d.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate font-medium text-primary underline underline-offset-4"
                  >
                    <span className="truncate">{d.nombre}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                ) : (
                  <p className="truncate font-medium">{d.nombre}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleBorrar(d.id)}
                disabled={borrandoId === d.id}
                aria-label="Eliminar documento"
                className="print:hidden"
              >
                <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
