"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  toggleActivoUsuario,
  cambiarRolUsuario,
  eliminarUsuario,
} from "@/app/(app)/ajustes/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Rol } from "@/lib/types/database.types";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

const ROL_LABEL: Record<Rol, string> = {
  admin: "Admin",
  staff: "Staff",
};

export function UsuariosPanel({
  usuariosIniciales,
  currentUserId,
}: {
  usuariosIniciales: Usuario[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState<string | null>(null);

  const adminsActivos = usuariosIniciales.filter(
    (u) => u.rol === "admin" && u.activo,
  ).length;

  function esUltimoAdmin(u: Usuario) {
    return u.id === currentUserId && u.rol === "admin" && adminsActivos <= 1;
  }

  async function handleToggleActivo(u: Usuario) {
    setPendiente(u.id);
    const result = await toggleActivoUsuario(u.id, !u.activo);
    setPendiente(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    router.refresh();
  }

  async function handleCambiarRol(u: Usuario, rol: Rol) {
    setPendiente(u.id);
    const result = await cambiarRolUsuario(u.id, rol);
    setPendiente(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    router.refresh();
  }

  async function handleEliminar(u: Usuario) {
    setPendiente(u.id);
    const result = await eliminarUsuario(u.id);
    setPendiente(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Usuario eliminado");
    router.refresh();
  }

  return (
    <ul className="divide-y rounded-md border">
      {usuariosIniciales.map((u) => {
        const bloqueado = esUltimoAdmin(u);
        return (
          <li key={u.id} className="space-y-2 p-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.nombre}
                  {u.id === currentUserId && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (tú)
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email}
                </p>
              </div>
              {!u.activo && <Badge variant="outline">Inactivo</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={u.rol}
                disabled={pendiente === u.id || bloqueado}
                onValueChange={(rol) =>
                  handleCambiarRol(u, rol as Rol)
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue>
                    {(value) => ROL_LABEL[value as Rol] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Switch
                  checked={u.activo}
                  disabled={pendiente === u.id || (bloqueado && u.activo)}
                  onCheckedChange={() => handleToggleActivo(u)}
                />
                Activo
              </div>

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto"
                      disabled={pendiente === u.id || bloqueado}
                    />
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Eliminar a {u.nombre}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Perderá el acceso a la app de inmediato. Esta acción no
                      se puede deshacer; si vuelve a necesitar acceso, tendrá
                      que solicitarlo de nuevo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleEliminar(u)}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
