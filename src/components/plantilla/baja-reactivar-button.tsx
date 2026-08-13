"use client";

import { useState } from "react";
import { toast } from "sonner";
import { toggleActivoJugadorLocal } from "@/app/(app)/plantilla/local-actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function BajaReactivarButton({
  jugadorId,
  activo,
  nombreCompleto,
}: {
  jugadorId: string;
  activo: boolean;
  nombreCompleto: string;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await toggleActivoJugadorLocal(jugadorId, !activo);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    setOpen(false);
    toast.success(activo ? "Jugador dado de baja" : "Jugador reactivado");
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant={activo ? "outline" : "default"} disabled={loading} />
        }
      >
        {activo ? "Dar de baja" : "Reactivar"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {activo
              ? `¿Dar de baja a ${nombreCompleto}?`
              : `¿Reactivar a ${nombreCompleto}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activo
              ? "Dejará de aparecer en el listado principal, pero se conserva todo su historial. Puedes reactivarlo cuando quieras."
              : "Volverá a aparecer en el listado principal de la plantilla."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
