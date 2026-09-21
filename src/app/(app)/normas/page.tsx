import { NormasPanel } from "@/components/inicio/normas-panel";
import { MultasPorJugador } from "@/components/normas/multas-por-jugador";

export default function NormasPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Normas</h1>
      <NormasPanel />
      <MultasPorJugador />
    </div>
  );
}
