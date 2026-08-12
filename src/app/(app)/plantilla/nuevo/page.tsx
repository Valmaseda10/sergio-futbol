import { JugadorForm } from "@/components/plantilla/jugador-form";

export default function NuevoJugadorPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuevo jugador</h1>
      <JugadorForm />
    </div>
  );
}
