"use client";

// URLs firmadas (1 h) de varios archivos del bucket privado "adjuntos", como
// {ruta: url}. Sin conexión o si falla alguna, simplemente no aparece en el mapa.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUrlsFirmadas(rutas: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const clave = rutas.join("|");

  useEffect(() => {
    const lista = clave ? clave.split("|") : [];
    if (lista.length === 0 || !navigator.onLine) return;
    let activo = true;
    const supabase = createClient();
    Promise.all(
      lista.map((ruta) =>
        supabase.storage
          .from("adjuntos")
          .createSignedUrl(ruta, 3600)
          .then(({ data }) => [ruta, data?.signedUrl ?? ""] as const),
      ),
    ).then((pares) => {
      if (activo) {
        setUrls(Object.fromEntries(pares.filter(([, url]) => url)));
      }
    });
    return () => {
      activo = false;
    };
  }, [clave]);

  return urls;
}
