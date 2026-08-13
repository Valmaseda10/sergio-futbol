"use client";

import { useEffect } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { startAutoSync, syncNow, useSyncStatus } from "@/lib/db/sync";
import { Badge } from "@/components/ui/badge";

/** Arranca la sincronización automática al montar el layout de la app. */
export function SyncBoot() {
  useEffect(() => {
    startAutoSync();
    if (navigator.onLine) void syncNow();
  }, []);

  return null;
}

export function SyncStatusBadge() {
  const { pending, online, syncing } = useSyncStatus();

  if (!online) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <CloudOff className="size-3" />
        Sin conexión{pending > 0 ? ` · ${pending} sin subir` : ""}
      </Badge>
    );
  }

  if (syncing || pending > 0) {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <RefreshCw className="size-3 animate-spin" />
        Sincronizando{pending > 0 ? ` (${pending})` : ""}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="gap-1 text-[10px] text-muted-foreground"
    >
      <Cloud className="size-3" />
      Sincronizado
    </Badge>
  );
}
