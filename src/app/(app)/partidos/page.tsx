import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PartidosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Partidos</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            Próximamente
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aquí irá el calendario, la convocatoria, la alineación, los eventos
          y la valoración de cada partido (Fase 4).
        </CardContent>
      </Card>
    </div>
  );
}
