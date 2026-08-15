"use client";

// Temporada que se está viendo/editando en toda la app: se elige una vez
// (en Ajustes) y se recuerda entre páginas y recargas via localDb.meta —
// preferencia de vista local al dispositivo, no dato de equipo (por eso no
// pasa por el outbox de sync.ts, igual que lastPullAt).

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { temporadaActual } from "@/lib/temporada";

const META_KEY = "temporadaSeleccionada";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useTemporadaSeleccionada() {
  const guardada = useLiveQuery(() => localDb.meta.get(META_KEY), []);
  const porDefecto = temporadaActual(hoyISO());
  const temporada = guardada?.value ?? porDefecto;

  function seleccionar(t: string) {
    void localDb.meta.put({ key: META_KEY, value: t });
  }

  return { temporada, seleccionar, temporadaActual: porDefecto };
}
