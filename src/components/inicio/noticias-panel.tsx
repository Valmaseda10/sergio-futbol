"use client";

// Noticias del día: enlace directo a Marca para leerlas. Se abre en otra
// pestaña (o en el navegador del iPad/iPhone) sin salir de la app.

import { ExternalLink, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ENLACES: { nombre: string; descripcion: string; url: string }[] = [
  {
    nombre: "Marca",
    descripcion: "Las noticias del día",
    url: "https://www.marca.com/",
  },
];

export function NoticiasPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Newspaper className="size-4" />
          Noticias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {ENLACES.map((e) => (
          <a
            key={e.url}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 hover:bg-muted/50"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{e.nombre}</span>
              <span className="block text-xs text-muted-foreground">{e.descripcion}</span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
