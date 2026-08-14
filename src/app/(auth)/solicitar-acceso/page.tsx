"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
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

const requestSchema = z
  .object({
    nombre: z.string().min(2, "Introduce tu nombre"),
    email: z.string().email("Introduce un email válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    passwordConfirm: z.string(),
    mensaje: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirm"],
  });

type RequestValues = z.infer<typeof requestSchema>;

export default function SolicitarAccesoPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
  });

  async function onSubmit(values: RequestValues) {
    const res = await fetch("/api/solicitudes/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: values.nombre,
        email: values.email,
        password: values.password,
        mensaje: values.mensaje,
      }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error("No se ha podido enviar la solicitud", {
        description: body.error,
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
            Ya puedes entrar con tu email y tu contraseña en cuanto un
            administrador acepte tu solicitud desde Ajustes. Hasta entonces
            verás un aviso de que tu acceso todavía no ha sido aceptado.
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
          Rellena tus datos y elige una contraseña; un administrador revisará
          tu solicitud.
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
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">Repite la contraseña</Label>
            <Input
              id="passwordConfirm"
              type="password"
              autoComplete="new-password"
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm && (
              <p className="text-sm text-destructive">
                {errors.passwordConfirm.message}
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
