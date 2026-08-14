"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PendienteAprobacionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saliendo, setSaliendo] = useState(false);

  async function handleSalir() {
    setSaliendo(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        <Clock className="size-10 text-muted-foreground" />
        <p className="font-medium">Solicitud pendiente</p>
        <p className="text-sm text-muted-foreground">
          Tu solicitud de acceso todavía no ha sido aceptada por el
          administrador. Podrás entrar en cuanto la acepte desde Ajustes.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSalir}
          disabled={saliendo}
        >
          {saliendo ? "Saliendo..." : "Cerrar sesión"}
        </Button>
      </CardContent>
    </Card>
  );
}
