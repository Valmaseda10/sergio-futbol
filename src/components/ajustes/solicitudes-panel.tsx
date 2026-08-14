"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Rol } from "@/lib/types/database.types";

interface Solicitud {
  id: string;
  nombre: string;
  email: string;
  mensaje: string | null;
  fecha_solicitud: string;
}

export function SolicitudesPanel({
  solicitudes,
}: {
  solicitudes: Solicitud[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, Rol>>({});

  async function handleAprobar(id: string) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/solicitudes/${id}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: roles[id] ?? "staff" }),
      });
      const body = await res.json();

      if (!res.ok) {
        toast.error("No se ha podido aprobar la solicitud", {
          description: body.error,
        });
        return;
      }

      toast.success("Solicitud aprobada, ya puede acceder");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleRechazar(id: string) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/solicitudes/${id}/rechazar`, {
        method: "POST",
      });
      const body = await res.json();

      if (!res.ok) {
        toast.error("No se ha podido rechazar la solicitud", {
          description: body.error,
        });
        return;
      }

      toast.success("Solicitud rechazada");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (solicitudes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay solicitudes pendientes.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden sm:table-cell">Mensaje</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {solicitudes.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.nombre}</TableCell>
              <TableCell className="break-all">{s.email}</TableCell>
              <TableCell className="hidden max-w-xs truncate sm:table-cell">
                {s.mensaje ?? "—"}
              </TableCell>
              <TableCell>
                <Select
                  defaultValue="staff"
                  onValueChange={(value) =>
                    setRoles((prev) => ({ ...prev, [s.id]: value as Rol }))
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button
                  size="sm"
                  disabled={pendingId === s.id}
                  onClick={() => handleAprobar(s.id)}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingId === s.id}
                  onClick={() => handleRechazar(s.id)}
                >
                  Rechazar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
