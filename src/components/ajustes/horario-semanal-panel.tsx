"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  crearHorarioLocal,
  actualizarHorarioLocal,
  eliminarHorarioLocal,
} from "@/app/(app)/ajustes/local-actions";
import { localDb } from "@/lib/db/local-db";
import { DIAS_SEMANA } from "@/lib/validations/entrenamiento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Horario {
  id: string;
  dia_semana: number;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
}

const DIA_LABEL: Record<number, string> = Object.fromEntries(
  DIAS_SEMANA.map((d) => [d.value, d.label]),
);

const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function HorarioForm({
  horario,
  diasDisponibles,
  onDone,
}: {
  horario?: Horario;
  diasDisponibles?: number[];
  onDone: () => void;
}) {
  const [dia, setDia] = useState(horario?.dia_semana ?? diasDisponibles?.[0] ?? 1);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const formData = new FormData(e.currentTarget);
    const values = {
      hora_inicio: String(formData.get("hora_inicio") ?? ""),
      hora_fin: String(formData.get("hora_fin") ?? ""),
      lugar: String(formData.get("lugar") ?? ""),
    };

    const result = horario
      ? await actualizarHorarioLocal(horario.id, values)
      : await crearHorarioLocal({ dia_semana: dia, ...values });
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(horario ? "Horario actualizado" : "Día añadido");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!horario && (
        <div className="space-y-1.5">
          <Label>Día</Label>
          <Select value={String(dia)} onValueChange={(v) => setDia(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue>{(value) => DIA_LABEL[Number(value)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(diasDisponibles ?? ORDEN_SEMANA).map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {DIA_LABEL[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="hora_inicio">Hora inicio</Label>
          <Input
            id="hora_inicio"
            name="hora_inicio"
            type="time"
            defaultValue={horario?.hora_inicio ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hora_fin">Hora fin</Label>
          <Input
            id="hora_fin"
            name="hora_fin"
            type="time"
            defaultValue={horario?.hora_fin ?? ""}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lugar">Lugar</Label>
        <Input id="lugar" name="lugar" defaultValue={horario?.lugar ?? ""} />
      </div>
      <Button type="submit" disabled={guardando} className="w-full">
        {guardando ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}

export function HorarioSemanalPanel() {
  const horarios = useLiveQuery(
    () =>
      localDb.horario_entrenamiento
        .toArray()
        .then((rows) =>
          rows.sort(
            (a, b) =>
              ORDEN_SEMANA.indexOf(a.dia_semana) -
              ORDEN_SEMANA.indexOf(b.dia_semana),
          ),
        ),
    [],
    [],
  );
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [editando, setEditando] = useState<Horario | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const diasLibres = ORDEN_SEMANA.filter(
    (v) => !horarios.some((h) => h.dia_semana === v),
  );

  async function handleEliminar(id: string) {
    setBorrando(id);
    await eliminarHorarioLocal(id);
    setBorrando(null);
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y rounded-md border">
        {horarios.map((h) => (
          <li key={h.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{DIA_LABEL[h.dia_semana]}</p>
              <p className="truncate text-xs text-muted-foreground">
                {h.hora_inicio && h.hora_fin
                  ? `${h.hora_inicio.slice(0, 5)} – ${h.hora_fin.slice(0, 5)}`
                  : "Sin hora"}
                {h.lugar ? ` · ${h.lugar}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditando(h)}
              aria-label="Editar horario"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={borrando === h.id}
              onClick={() => handleEliminar(h.id)}
              aria-label="Quitar día"
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
        {horarios.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">
            Todavía no hay días de entrenamiento configurados.
          </li>
        )}
      </ul>

      {diasLibres.length > 0 &&
        (mostrarNuevo ? (
          <div className="rounded-md border p-3">
            <HorarioForm
              diasDisponibles={diasLibres}
              onDone={() => setMostrarNuevo(false)}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setMostrarNuevo(true)}
          >
            Añadir día
          </Button>
        ))}

      <p className="text-xs text-muted-foreground">
        Partido: sábado o domingo, según calendario de liga.
      </p>

      <Dialog
        open={editando !== null}
        onOpenChange={(open) => !open && setEditando(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando && DIA_LABEL[editando.dia_semana]}
            </DialogTitle>
          </DialogHeader>
          {editando && (
            <HorarioForm horario={editando} onDone={() => setEditando(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
