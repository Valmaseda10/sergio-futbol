import { cn } from "@/lib/utils";
import { PitchHalfLines } from "@/components/partidos/campo-mini-selector";

interface GolUbicacion {
  pos_x: number;
  pos_y: number;
  a_favor: boolean;
}

export function MapaGoles({ goles }: { goles: GolUbicacion[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Verde oscuro = Infantil B (a favor) · Rojo = en contra
      </p>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-pitch">
        <PitchHalfLines />
        {goles.map((g, i) => (
          <span
            key={i}
            className={cn(
              "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow",
              g.a_favor ? "bg-[#1b5e3a]" : "bg-destructive",
            )}
            style={{ top: `${g.pos_y}%`, left: `${g.pos_x}%` }}
          />
        ))}
      </div>
    </div>
  );
}
