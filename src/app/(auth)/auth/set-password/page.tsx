"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type SetPasswordValues = z.infer<typeof setPasswordSchema>;

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [comprobando, setComprobando] = useState(true);
  const [sesionValida, setSesionValida] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
  });

  // El enlace de invitación/recuperación llega con el token de sesión en el
  // fragmento de la URL (#access_token=...), que solo el navegador puede
  // leer (nunca llega al servidor). El cliente de Supabase lo detecta y
  // procesa automáticamente al inicializarse (detectSessionInUrl); si en
  // vez de eso llega un parámetro ?code= (PKCE), lo intercambiamos aquí.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      const { data } = await supabase.auth.getSession();
      if (cancelado) return;

      if (!data.session) {
        toast.error("El enlace no es válido o ha caducado", {
          description: "Pide que te reenvíen la invitación o el email.",
        });
        router.push("/login");
        return;
      }

      setSesionValida(true);
      setComprobando(false);
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: SetPasswordValues) {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error("No se ha podido guardar la contraseña", {
        description: error.message,
      });
      return;
    }

    toast.success("Contraseña guardada");
    router.push("/plantilla");
    router.refresh();
  }

  if (comprobando || !sesionValida) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Comprobando el enlace...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Elige tu contraseña</CardTitle>
        <CardDescription>
          La necesitarás para entrar la próxima vez.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
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
            <Label htmlFor="confirmPassword">Repite la contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
