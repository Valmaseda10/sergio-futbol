"use client";

// Motor de sincronización: vuelca Supabase en Dexie (pullAll) y reenvía la
// cola de escrituras pendientes (flushOutbox) cuando hay conexión.
// Resolución de conflictos: last-write-wins por orden de llegada, sin merge
// (CLAUDE.md: "suficiente para 2 usuarios").

import { useSyncExternalStore } from "react";
import type { Table } from "dexie";
import { createClient } from "@/lib/supabase/client";
import {
  localDb,
  SYNCED_TABLES,
  CONFLICT_TARGETS,
  type OutboxEntry,
  type OutboxOp,
  type SyncedTable,
} from "@/lib/db/local-db";

type Listener = () => void;
const listeners = new Set<Listener>();
let pendingCount = 0;
let syncing = false;
let lastError: string | null = null;
// Version que se incrementa en cada notify(): syncing/lastError no viven en
// el snapshot de useSyncExternalStore (solo pendingCount), así que sin esto
// un notify() que solo cambia syncing/lastError no fuerza un re-render.
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((l) => l());
}

async function refreshPendingCount() {
  pendingCount = await localDb.outbox.count();
  notify();
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function useSyncStatus() {
  // Se suscribe a `version` (no solo a pendingCount) para que cualquier
  // notify() —incluidos los que solo cambian syncing/lastError— fuerce un
  // re-render que lea esos valores frescos más abajo.
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0,
  );
  const online = useOnlineStatus();

  return { pending: pendingCount, online, syncing, lastError };
}

/** Encola una mutación local y trata de enviarla ya mismo si hay conexión. */
export async function queueMutation(
  table: SyncedTable,
  op: OutboxOp,
  recordId: string,
  payload?: Record<string, unknown>,
) {
  if (op === "delete") {
    // Si el registro nunca llegó a sincronizarse (insert/update aún en cola),
    // basta con retirarlo de la cola: no existe en el servidor.
    const pendientes = await localDb.outbox
      .where("table")
      .equals(table)
      .filter((e) => e.recordId === recordId)
      .toArray();
    const habiaInsert = pendientes.some((e) => e.op === "insert");
    if (pendientes.length > 0) {
      await localDb.outbox.bulkDelete(
        pendientes.map((e) => e.id).filter((id): id is number => id != null),
      );
    }
    if (habiaInsert) {
      await refreshPendingCount();
      return;
    }
  }

  const entry: OutboxEntry = {
    table,
    op,
    recordId,
    payload,
    createdAt: Date.now(),
  };
  await localDb.outbox.add(entry);
  await refreshPendingCount();

  if (navigator.onLine) {
    void flushOutbox();
  }
}

/** Reenvía la cola de escrituras pendientes contra Supabase, en orden. */
export async function flushOutbox(): Promise<{ ok: boolean; error?: string }> {
  if (syncing) return { ok: true };
  syncing = true;
  notify();

  // Los nombres de tabla son dinámicos (vienen de la cola), así que el tipado
  // genérico de supabase-js no puede casarlos con su unión de esquemas: se
  // trata como `any` solo en este punto de la frontera dinámica.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  try {
    while (true) {
      const entries = await localDb.outbox
        .orderBy("createdAt")
        .limit(20)
        .toArray();
      if (entries.length === 0) break;

      for (const entry of entries) {
        let error: { message: string } | null = null;

        if (entry.op === "insert") {
          const conflictTarget = CONFLICT_TARGETS[entry.table];
          ({ error } = conflictTarget
            ? await supabase
                .from(entry.table)
                .upsert(entry.payload, { onConflict: conflictTarget })
            : await supabase.from(entry.table).insert(entry.payload));
        } else if (entry.op === "update") {
          ({ error } = await supabase
            .from(entry.table)
            .update(entry.payload)
            .eq("id", entry.recordId));
        } else {
          ({ error } = await supabase
            .from(entry.table)
            .delete()
            .eq("id", entry.recordId));
        }

        if (error) {
          lastError = error.message;
          syncing = false;
          notify();
          return { ok: false, error: error.message };
        }

        if (entry.id != null) {
          await localDb.outbox.delete(entry.id);
        }
        pendingCount = Math.max(0, pendingCount - 1);
        notify();
      }
    }

    lastError = null;
    return { ok: true };
  } catch (e) {
    lastError = e instanceof Error ? e.message : "Error de sincronización";
    return { ok: false, error: lastError };
  } finally {
    syncing = false;
    await refreshPendingCount();
  }
}

/** Descarga el estado completo de cada tabla sincronizada desde Supabase. */
export async function pullAll(): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();

  try {
    for (const table of SYNCED_TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        return { ok: false, error: error.message };
      }
      const localTable = localDb[table] as Table<unknown, string>;
      await localDb.transaction("rw", localTable, async () => {
        await localTable.clear();
        if (data && data.length > 0) {
          await localTable.bulkPut(data);
        }
      });
    }

    await localDb.meta.put({ key: "lastPullAt", value: String(Date.now()) });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al sincronizar",
    };
  }
}

/** Drena la cola pendiente y luego refresca todo desde el servidor. */
export async function syncNow(): Promise<{ ok: boolean; error?: string }> {
  if (!navigator.onLine) return { ok: false, error: "Sin conexión" };

  const flush = await flushOutbox();
  if (!flush.ok) return flush;

  return pullAll();
}

let autoSyncStarted = false;

/** Arranca la sincronización automática al recuperar conexión. */
export function startAutoSync() {
  if (autoSyncStarted) return;
  autoSyncStarted = true;

  void refreshPendingCount();
  window.addEventListener("online", () => void syncNow());

  setInterval(() => {
    if (navigator.onLine) void flushOutbox();
  }, 30_000);
}
