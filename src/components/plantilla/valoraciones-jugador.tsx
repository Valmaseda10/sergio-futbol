"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  crearValoracionJugador,
  eliminarValoracionJugador,
} from "@/app/(app)/plantilla/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Valoracion {
  id: string;
  fecha: string;
  tecnica: number | null;
  fisico: number | null;
  tactica: number | null;
  actitud: number | null;
  notas: string | null;
}

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatearFechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function ValoracionesJugador({
  jugadorId,
  valoracionesIniciales,
}: {
  jugadorId: string;
  valoracionesIniciales: Valoracion[];
}) {
  const router = useRouter();
  const [valoraciones, setValoraciones] = useState(
    [...valoracionesIniciales].sort((a, b) => a.fecha.localeCompare(b.fecha)),
  );
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const formData = new FormData(e.currentTarget);
    const result = await crearValoracionJugador(jugadorId, formData);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Valoración guardada");
    setValoraciones((prev) =>
      [...prev, result.valoracion].sort((a, b) =>
        a.fecha.localeCompare(b.fecha),
      ),
    );
    setMostrarForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setBorrando(id);
    const previas = valoraciones;
    setValoraciones((prev) => prev.filter((v) => v.id !== id));

    const result = await eliminarValoracionJugador(id, jugadorId);
    setBorrando(null);

    if ("error" in result) {
      toast.error(result.error);
      setValoraciones(previas);
    }
  }

  const datosGrafico = valoraciones.map((v) => ({
    fecha: formatearFechaCorta(v.fecha),
    Técnica: v.tecnica,
    Físico: v.fisico,
    Táctica: v.tactica,
    Actitud: v.actitud,
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Valoraciones</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMostrarForm((prev) => !prev)}
        >
          {mostrarForm ? "Cancelar" : "Nueva"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {mostrarForm && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                name="fecha"
                type="date"
                defaultValue={hoyISO()}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tecnica">Técnica (1-10)</Label>
                <Input id="tecnica" name="tecnica" type="number" min={1} max={10} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fisico">Físico (1-10)</Label>
                <Input id="fisico" name="fisico" type="number" min={1} max={10} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tactica">Táctica (1-10)</Label>
                <Input id="tactica" name="tactica" type="number" min={1} max={10} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="actitud">Actitud (1-10)</Label>
                <Input id="actitud" name="actitud" type="number" min={1} max={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" name="notas" rows={2} />
            </div>
            <Button type="submit" disabled={guardando} className="w-full">
              {guardando ? "Guardando..." : "Guardar valoración"}
            </Button>
          </form>
        )}

        {valoraciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay valoraciones registradas.
          </p>
        ) : (
          <>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" fontSize={12} />
                  <YAxis domain={[0, 10]} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Técnica" stroke="#3b82f6" />
                  <Line type="monotone" dataKey="Físico" stroke="#22c55e" />
                  <Line type="monotone" dataKey="Táctica" stroke="#a855f7" />
                  <Line type="monotone" dataKey="Actitud" stroke="#f97316" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <ul className="divide-y rounded-md border text-sm">
              {valoraciones
                .slice()
                .reverse()
                .map((v) => (
                  <li key={v.id} className="flex items-center gap-3 p-3">
                    <span className="w-20 shrink-0 text-muted-foreground">
                      {formatearFechaCorta(v.fecha)}
                    </span>
                    <span className="min-w-0 flex-1">
                      T: {v.tecnica ?? "—"} · F: {v.fisico ?? "—"} · Tac:{" "}
                      {v.tactica ?? "—"} · A: {v.actitud ?? "—"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={borrando === v.id}
                      onClick={() => handleDelete(v.id)}
                      aria-label="Eliminar valoración"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
