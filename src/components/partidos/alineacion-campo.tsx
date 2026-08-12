"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { FORMACIONES, type Formacion } from "@/lib/formaciones";
import { guardarAlineacion } from "@/app/(app)/partidos/actions";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { Button } from "@/components/ui/button";
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

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  fotoSignedUrl: string | null;
}

function remapearAFormacion(
  pares: { jugadorId: string; label: string }[],
  formacion: Formacion,
) {
  const restantes = [...pares];
  const resultado: Record<string, string> = {};

  for (const hueco of formacion.huecos) {
    const idx = restantes.findIndex((p) => p.label === hueco.label);
    if (idx !== -1) {
      resultado[hueco.id] = restantes[idx].jugadorId;
      restantes.splice(idx, 1);
    }
  }

  return resultado;
}

function mejorFormacionInicial(pares: { jugadorId: string; label: string }[]) {
  if (pares.length === 0) return FORMACIONES[0];

  let mejor = FORMACIONES[0];
  let mejorPuntuacion = -1;

  for (const formacion of FORMACIONES) {
    const asignados = Object.keys(remapearAFormacion(pares, formacion)).length;
    if (asignados > mejorPuntuacion) {
      mejorPuntuacion = asignados;
      mejor = formacion;
    }
  }

  return mejor;
}

export function AlineacionCampo({
  partidoId,
  convocados,
  titularesIniciales,
}: {
  partidoId: string;
  convocados: Jugador[];
  titularesIniciales: { jugadorId: string; posicion: string }[];
}) {
  const router = useRouter();
  const paresIniciales = titularesIniciales.map((t) => ({
    jugadorId: t.jugadorId,
    label: t.posicion,
  }));

  const [formacion, setFormacion] = useState<Formacion>(() =>
    mejorFormacionInicial(paresIniciales),
  );
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>(
    () => remapearAFormacion(paresIniciales, mejorFormacionInicial(paresIniciales)),
  );
  const [huecoAbierto, setHuecoAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const jugadoresPorId = useMemo(
    () => new Map(convocados.map((j) => [j.id, j])),
    [convocados],
  );

  const asignadosIds = new Set(Object.values(asignaciones));
  const disponibles = convocados.filter((j) => !asignadosIds.has(j.id));

  function handleCambiarFormacion(nuevoValue: string | null) {
    const nuevaFormacion = FORMACIONES.find((f) => f.value === nuevoValue);
    if (!nuevaFormacion) return;

    const paresActuales = Object.entries(asignaciones).map(
      ([huecoId, jugadorId]) => ({
        jugadorId,
        label: formacion.huecos.find((h) => h.id === huecoId)?.label ?? "",
      }),
    );

    setFormacion(nuevaFormacion);
    setAsignaciones(remapearAFormacion(paresActuales, nuevaFormacion));
  }

  function handleAsignar(huecoId: string, jugadorId: string) {
    setAsignaciones((prev) => ({ ...prev, [huecoId]: jugadorId }));
    setHuecoAbierto(null);
  }

  function handleQuitar(huecoId: string) {
    setAsignaciones((prev) => {
      const next = { ...prev };
      delete next[huecoId];
      return next;
    });
    setHuecoAbierto(null);
  }

  async function handleGuardar() {
    setGuardando(true);
    const titulares = Object.entries(asignaciones).map(([huecoId, jugadorId]) => ({
      jugadorId,
      posicion: formacion.huecos.find((h) => h.id === huecoId)?.label ?? "",
    }));
    const suplentesIds = disponibles.map((j) => j.id);

    const result = await guardarAlineacion(partidoId, titulares, suplentesIds);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Alineación guardada");
    router.push(`/partidos/${partidoId}`);
    router.refresh();
  }

  const huecoActivo = formacion.huecos.find((h) => h.id === huecoAbierto);
  const jugadorEnHuecoActivo = huecoAbierto
    ? jugadoresPorId.get(asignaciones[huecoAbierto] ?? "")
    : undefined;

  return (
    <div className="space-y-4">
      <Select value={formacion.value} onValueChange={handleCambiarFormacion}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FORMACIONES.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-green-700">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute inset-x-[20%] top-0 h-[12%] border-x border-b border-white/40" />
        <div className="absolute inset-x-[20%] bottom-0 h-[12%] border-x border-t border-white/40" />

        {formacion.huecos.map((hueco) => {
          const jugador = jugadoresPorId.get(asignaciones[hueco.id] ?? "");
          return (
            <button
              key={hueco.id}
              type="button"
              onClick={() => setHuecoAbierto(hueco.id)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ top: `${hueco.top}%`, left: `${hueco.left}%` }}
            >
              <span
                className={
                  jugador
                    ? "flex size-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-foreground shadow"
                    : "flex size-9 items-center justify-center rounded-full border-2 border-dashed border-white/70 text-white/70"
                }
              >
                {jugador ? (jugador.dorsal ?? jugador.nombre[0]) : "+"}
              </span>
              <span className="max-w-16 truncate rounded bg-black/40 px-1 text-[10px] text-white">
                {jugador ? jugador.apellidos : hueco.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Suplentes ({disponibles.length})
        </p>
        {disponibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos los convocados están en el campo.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {disponibles.map((j) => (
              <li
                key={j.id}
                className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm"
              >
                <JugadorAvatar
                  src={j.fotoSignedUrl}
                  nombre={j.nombre}
                  apellidos={j.apellidos}
                  className="size-6"
                />
                {j.dorsal != null ? `${j.dorsal} · ` : ""}
                {j.apellidos}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button onClick={handleGuardar} disabled={guardando} className="w-full">
        {guardando ? "Guardando..." : "Guardar alineación"}
      </Button>

      <Dialog
        open={huecoAbierto !== null}
        onOpenChange={(open) => !open && setHuecoAbierto(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{huecoActivo?.label}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {jugadorEnHuecoActivo && (
              <button
                type="button"
                onClick={() => huecoAbierto && handleQuitar(huecoAbierto)}
                className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <X className="size-4" />
                Quitar a {jugadorEnHuecoActivo.nombre}
              </button>
            )}
            {disponibles.length === 0 && !jugadorEnHuecoActivo && (
              <p className="p-2 text-sm text-muted-foreground">
                No quedan convocados libres.
              </p>
            )}
            {disponibles.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => huecoAbierto && handleAsignar(huecoAbierto, j.id)}
                className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted"
              >
                <JugadorAvatar
                  src={j.fotoSignedUrl}
                  nombre={j.nombre}
                  apellidos={j.apellidos}
                  className="size-7"
                />
                {j.dorsal != null ? `${j.dorsal} · ` : ""}
                {j.nombre} {j.apellidos}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
