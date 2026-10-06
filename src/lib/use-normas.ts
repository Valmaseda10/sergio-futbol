"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb, type LocalNorma } from "@/lib/db/local-db";

/** Catálogo de faltas ordenado como se creó; vacío mientras carga. */
export function useNormas(): LocalNorma[] {
  return useLiveQuery(
    () =>
      localDb.normas
        .toArray()
        .then((rows) =>
          rows.sort(
            (a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at),
          ),
        ),
    [],
    [],
  );
}
