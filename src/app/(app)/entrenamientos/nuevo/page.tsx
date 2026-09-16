import { EntrenamientoForm } from "@/components/entrenamientos/entrenamiento-form";

export default function NuevoEntrenamientoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Crear Entrenamiento</h1>
      <p className="text-sm text-muted-foreground">
        Rellena la sesión con la misma información que antes ibas metiendo en
        PowerPoint — luego, desde su ficha, puedes descargarla en PDF.
      </p>
      <EntrenamientoForm />
    </div>
  );
}
