"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { guardarValoracionLocal } from "@/app/(app)/partidos/local-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export function ValoracionForm({
  partidoId,
  valoracionInicial,
  ratingInicial,
}: {
  partidoId: string;
  valoracionInicial: string;
  ratingInicial: string;
}) {
  const router = useRouter();
  const [valoracion, setValoracion] = useState(valoracionInicial);
  const [rating, setRating] = useState(ratingInicial);
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    setGuardando(true);
    const result = await guardarValoracionLocal(partidoId, valoracion, rating);
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Valoración guardada");
    router.push(`/partidos/${partidoId}`);
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label htmlFor="valoracion_general">Valoración general</Label>
          <Textarea
            id="valoracion_general"
            rows={5}
            placeholder="Cómo ha ido el partido, aspectos a destacar..."
            value={valoracion}
            onChange={(e) => setValoracion(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Puntuación del equipo</Label>
          <Select value={rating} onValueChange={(v) => setRating(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sin puntuar" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGuardar} disabled={guardando} className="w-full">
          {guardando ? "Guardando..." : "Guardar valoración"}
        </Button>
      </CardContent>
    </Card>
  );
}
