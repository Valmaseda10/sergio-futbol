"use client";

// Dentro de una tarea de ABP: elegir las jugadas de la sección ABP que toca
// trabajar ese día y añadir imágenes extra (capturas, fotos, dibujos) para
// tenerlas claras en la ficha de la sesión.

import { useRef } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDb } from "@/lib/db/local-db";
import { FASES_ABP, TIPOS_ABP, tipoDeJugada } from "@/lib/plan-partido";

export function AbpExtras({
  seleccion,
  onSeleccion,
  existentes,
  onQuitarExistente,
  nuevos,
  onNuevos,
}: {
  /** Ids de las jugadas de ABP elegidas. */
  seleccion: string[];
  onSeleccion: (ids: string[]) => void;
  /** Imágenes ya guardadas en la sesión: ruta y URL para verlas. */
  existentes: { ruta: string; url: string | null }[];
  onQuitarExistente: (ruta: string) => void;
  /** Imágenes nuevas (aún sin subir). */
  nuevos: File[];
  onNuevos: (archivos: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const jugadas = useLiveQuery(
    () =>
      localDb.jugadas_abp
        .toArray()
        .then((rows) =>
          rows.sort(
            (a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at),
          ),
        ),
    [],
    [],
  );

  function alternar(id: string) {
    onSeleccion(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);
  }

  function anadir(files: FileList | File[] | null) {
    const imagenes = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (imagenes.length > 0) onNuevos([...nuevos, ...imagenes]);
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <p className="text-xs font-semibold">Jugadas de ABP que se trabajan este día</p>
        {jugadas.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Todavía no hay jugadas.{" "}
            <Link href="/plan-partido/abp" className="font-medium underline">
              Créalas en Plan de partido → ABP
            </Link>
            .
          </p>
        ) : (
          TIPOS_ABP.map((tipo) => {
            const delTipo = jugadas.filter((j) => tipoDeJugada(j.tipo) === tipo.value);
            if (delTipo.length === 0) return null;
            return (
              <div key={tipo.value} className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">{tipo.plural}</p>
                <div className="flex flex-wrap gap-1.5">
                  {delTipo.map((j) => {
                    const activa = seleccion.includes(j.id);
                    const color = FASES_ABP.find((f) => f.value === j.fase)?.color;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => alternar(j.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          activa
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted"
                        }`}
                        style={activa ? undefined : { color }}
                      >
                        {j.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold">Más imágenes (capturas, fotos, dibujos)</p>
        <div className="flex flex-wrap gap-2">
          {existentes.map((x) => (
            <div key={x.ruta} className="relative">
              {x.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={x.url} alt="" className="h-20 w-28 rounded border object-cover" />
              ) : (
                <div className="flex h-20 w-28 items-center justify-center rounded border text-[10px] text-muted-foreground">
                  Sin conexión
                </div>
              )}
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -top-2 -right-2 size-6 rounded-full"
                aria-label="Quitar imagen"
                onClick={() => onQuitarExistente(x.ruta)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
          {nuevos.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
                alt=""
                className="h-20 w-28 rounded border object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -top-2 -right-2 size-6 rounded-full"
                aria-label="Quitar imagen"
                onClick={() => onNuevos(nuevos.filter((_, k) => k !== i))}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onPaste={(e) => {
            const archivos = Array.from(e.clipboardData.items)
              .filter((i) => i.type.startsWith("image/"))
              .map((i) => i.getAsFile())
              .filter((f): f is File => !!f);
            if (archivos.length > 0) {
              e.preventDefault();
              anadir(archivos);
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-4 text-xs text-muted-foreground hover:bg-muted/50 focus:ring-2 focus:ring-ring focus:outline-none"
        >
          <ImagePlus className="size-4" />
          Elige imágenes o pega una captura aquí (Ctrl+V)
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            anadir(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
