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
      <Badge className="gap-1 border-transparent bg-[#3a1418] text-[10px] text-[#e37980]">
        <CloudOff className="size-3" />
        Sin conexión{pending > 0 ? ` · ${pending} sin subir` : ""}
      </Badge>
    );
  }

  if (syncing || pending > 0) {
    return (
      <Badge className="gap-1 border-transparent bg-[#3a2e14] text-[10px] text-[#d9a857]">
        <RefreshCw className="size-3 animate-spin" />
        Sincronizando{pending > 0 ? ` (${pending})` : ""}
      </Badge>
    );
  }

  return (
    <Badge className="gap-1 border-transparent bg-[#16241c] text-[10px] text-[#5c9473]">
      <Cloud className="size-3" />
      Sincronizado
    </Badge>
  );
}
