"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  crearEstado,
  actualizarEstado,
  toggleActivoEstado,
} from "@/app/(app)/ajustes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Estado {
  id: string;
  nombre: string;
  color: string;
  tipo: "entrenamiento" | "general";
  activo: boolean;
}

const TIPO_LABEL: Record<Estado["tipo"], string> = {
  entrenamiento: "Entrenamiento",
  general: "General",
};

function EstadoForm({
  estado,
  onDone,
}: {
  estado?: Estado;
  onDone: () => void;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const formData = new FormData(e.currentTarget);
    const result = estado
      ? await actualizarEstado(estado.id, formData)
      : await crearEstado(formData);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(estado ? "Estado actualizado" : "Estado creado");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={estado?.nombre}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue={estado?.color ?? "#94a3b8"}
            className="h-9 w-full p-1"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select name="tipo" defaultValue={estado?.tipo ?? "general"}>
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue>
                {(value) => TIPO_LABEL[value as Estado["tipo"]] ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrenamiento">Entrenamiento</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={guardando} className="w-full">
        {guardando ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}

export function EstadosPanel({
  estadosIniciales,
}: {
  estadosIniciales: Estado[];
}) {
  const router = useRouter();
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<Estado | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);

  async function handleToggle(estado: Estado) {
    setPendiente(estado.id);
    const result = await toggleActivoEstado(estado.id, !estado.activo);
    setPendiente(null);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-md border">
        {estadosIniciales.map((estado) => (
          <li key={estado.id} className="flex items-center gap-3 p-3">
            <span
              className="size-4 shrink-0 rounded-full"
              style={{ backgroundColor: estado.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{estado.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {TIPO_LABEL[estado.tipo]}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditando(estado)}
              aria-label="Editar estado"
            >
              <Pencil className="size-4" />
            </Button>
            <Switch
              checked={estado.activo}
              disabled={pendiente === estado.id}
              onCheckedChange={() => handleToggle(estado)}
            />
          </li>
        ))}
      </ul>

      {mostrarNuevo ? (
        <div className="rounded-md border p-3">
          <EstadoForm onDone={() => setMostrarNuevo(false)} />
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setMostrarNuevo(true)}
        >
          Añadir estado
        </Button>
      )}

      <Dialog
        open={editando !== null}
        onOpenChange={(open) => !open && setEditando(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar estado</DialogTitle>
          </DialogHeader>
          {editando && (
            <EstadoForm estado={editando} onDone={() => setEditando(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
