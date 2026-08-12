"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const requestSchema = z.object({
  nombre: z.string().min(2, "Introduce tu nombre"),
  email: z.string().email("Introduce un email válido"),
  mensaje: z.string().optional(),
});

type RequestValues = z.infer<typeof requestSchema>;

export default function SolicitarAccesoPage() {
  const supabase = createClient();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
  });

  async function onSubmit(values: RequestValues) {
    const { error } = await supabase.from("solicitudes_acceso").insert({
      nombre: values.nombre,
      email: values.email,
      mensaje: values.mensaje || null,
    });

    if (error) {
      // El error más probable en un scaffold recién creado es que las
      // variables de entorno de Supabase todavía sean placeholders.
      toast.error("No se ha podido enviar la solicitud", {
        description: "Comprueba la configuración de Supabase.",
      });
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <CheckCircle2 className="size-10 text-green-600" />
          <p className="font-medium">Solicitud enviada</p>
          <p className="text-sm text-muted-foreground">
            Un administrador revisará tu solicitud y recibirás un email de
            invitación si se aprueba.
          </p>
          <Link href="/login" className="text-sm font-medium underline">
            Volver al inicio de sesión
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitar acceso</CardTitle>
        <CardDescription>
          Rellena tus datos; un administrador revisará tu solicitud.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" autoComplete="name" {...register("nombre")} />
            {errors.nombre && (
              <p className="text-sm text-destructive">
                {errors.nombre.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mensaje">Mensaje (opcional)</Label>
            <Textarea
              id="mensaje"
              rows={3}
              placeholder="Ej: soy el segundo entrenador del equipo"
              {...register("mensaje")}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </form>
      </CardContent>
      <p className="px-6 pb-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes acceso?{" "}
        <Link href="/login" className="font-medium underline">
          Inicia sesión
        </Link>
      </p>
    </Card>
  );
}
