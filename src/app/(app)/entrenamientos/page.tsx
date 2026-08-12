import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EntrenamientosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Entrenamientos</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            Próximamente
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aquí irá el calendario, la planificación de sesión y el registro de
          asistencia (Fase 3).
        </CardContent>
      </Card>
    </div>
  );
}
