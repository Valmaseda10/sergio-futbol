import { NormasPanel } from "@/components/inicio/normas-panel";
import { MultasPorJugador } from "@/components/normas/multas-por-jugador";

export default function NormasPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Normas</h1>
      <p className="text-sm text-muted-foreground">
        Los capitanes tienen las multas dobles (x2): se marcan con el botón &quot;Capitán&quot; en
        la ficha de cada jugador.
      </p>
      <NormasPanel />
      <MultasPorJugador />
    </div>
  );
}
