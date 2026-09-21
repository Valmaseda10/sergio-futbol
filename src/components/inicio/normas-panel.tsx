"use client";

import { ScrollText } from "lucide-react";
import { CATEGORIAS_NORMA, NORMAS, PUNTOS_CASTIGO } from "@/lib/validations/norma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function NormasPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="size-4" />
          Régimen interno
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {CATEGORIAS_NORMA.map((cat) => (
          <div key={cat.value}>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              {cat.label}
            </p>
            <ul className="space-y-1">
              {NORMAS.filter((n) => n.categoria === cat.value).map((n) => (
                <li
                  key={n.texto}
                  className="flex items-center justify-between gap-2 py-0.5 text-sm"
                >
                  <span className="min-w-0 flex-1">{n.texto}</span>
                  <Badge variant="outline" className="shrink-0">
                    {n.puntos} pt{n.puntos > 1 ? "s" : ""}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="border-t pt-3 text-xs text-muted-foreground">
          Al llegar a {PUNTOS_CASTIGO} puntos sin resolver: recoger material o
          traer algo para compartir en la siguiente sesión. Los puntos se
          resuelven en ese momento, no se arrastran. Sin dinero de por medio.
        </p>
      </CardContent>
    </Card>
  );
}
