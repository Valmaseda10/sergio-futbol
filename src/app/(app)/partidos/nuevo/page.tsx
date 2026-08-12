import { PartidoForm } from "@/components/partidos/partido-form";

export default function NuevoPartidoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuevo partido</h1>
      <PartidoForm />
    </div>
  );
}
