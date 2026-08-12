import { EntrenamientoForm } from "@/components/entrenamientos/entrenamiento-form";

export default function NuevoEntrenamientoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuevo entrenamiento</h1>
      <EntrenamientoForm />
    </div>
  );
}
