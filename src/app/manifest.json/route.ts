// Manifest de la PWA, generado dinámicamente en vez de un JSON estático,
// para que el nombre/descripción salgan del club configurado en este
// despliegue (ver src/lib/club-config.ts) sin tener que tocar archivos por
// cada club nuevo. Se sirve en /manifest.json (no /manifest.webmanifest,
// la convención nativa de Next) porque public/sw.js ya cachea esa ruta
// explícitamente durante la instalación del service worker.

import { NextResponse } from "next/server";
import { clubConfig } from "@/lib/club-config";
import { temporadaActual, temporadaCorta } from "@/lib/temporada";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function GET() {
  const temporada = temporadaCorta(temporadaActual(hoyISO()));
  const nombreCorto = `${clubConfig.nombreEquipo} ${temporada}`;

  return NextResponse.json(
    {
      name: `${nombreCorto} — Panel del entrenador`,
      short_name: nombreCorto,
      description: `Gestión del equipo ${clubConfig.nombreEquipo} (${clubConfig.nombreClub})`,
      start_url: "/inicio",
      scope: "/",
      display: "standalone",
      background_color: "#f7f6f3",
      theme_color: "#1c1512",
      orientation: "portrait",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
      },
    },
  );
}
