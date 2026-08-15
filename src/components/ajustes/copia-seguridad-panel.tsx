"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { localDb, SYNCED_TABLES } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function CopiaSeguridadPanel() {
  const [generando, setGenerando] = useState(false);

  async function handleExportar() {
    setGenerando(true);
    try {
      const datos: Record<string, unknown[]> = {};
      for (const tabla of SYNCED_TABLES) {
        datos[tabla] = await localDb.table(tabla).toArray();
      }

      const contenido = JSON.stringify(
        { exportadoEl: new Date().toISOString(), datos },
        null,
        2,
      );
      const blob = new Blob([contenido], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `infantil-b-copia-seguridad-${hoyISO()}.json`;
      enlace.click();
      URL.revokeObjectURL(url);

      toast.success("Copia de seguridad descargada");
    } catch {
      toast.error("No se ha podido generar la copia de seguridad");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Descarga un archivo JSON con todos los datos de la aplicación
        (plantilla, entrenamientos, partidos, valoraciones, lesiones,
        vídeos...) tal y como están guardados ahora mismo en este
        dispositivo.
      </p>
      <Button onClick={handleExportar} disabled={generando}>
        <Download className="size-4" />
        {generando ? "Generando..." : "Descargar copia de seguridad"}
      </Button>
    </div>
  );
}
