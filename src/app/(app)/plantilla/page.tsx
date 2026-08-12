import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlantillaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Plantilla</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            Próximamente
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aquí irá el listado y la ficha de cada jugador (Fase 2).
        </CardContent>
      </Card>
    </div>
  );
}
