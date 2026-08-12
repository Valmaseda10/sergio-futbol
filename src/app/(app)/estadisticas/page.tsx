import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EstadisticasPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Estadísticas</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            Próximamente
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aquí irá el dashboard con las gráficas por jugador y equipo (Fase
          5).
        </CardContent>
      </Card>
    </div>
  );
}
