"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const loginSchema = z.object({
  email: z.string().email("Introduce un email válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sendingReset, setSendingReset] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginValues) {
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      toast.error("No se ha podido iniciar sesión", {
        description: "Revisa el email y la contraseña e inténtalo de nuevo.",
      });
      return;
    }

    router.push("/plantilla");
    router.refresh();
  }

  async function handleForgotPassword() {
    const email = getValues("email");
    if (!email) {
      toast.error("Escribe primero tu email en el campo de arriba");
      return;
    }

    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/set-password`,
    });
    setSendingReset(false);

    if (error) {
      toast.error("No se ha podido enviar el email de recuperación");
      return;
    }

    toast.success("Te hemos enviado un email para restablecer la contraseña");
  }

  return (
    <>
      <div className="login-rainbow-bg fixed inset-0 -z-10" />
      <div className="login-rainbow-border rounded-xl p-[3px]">
        <Card className="rounded-[calc(var(--radius-xl)-3px)]">
          <CardHeader>
            <CardTitle className="login-rainbow-text text-2xl font-bold">
              Iniciar sesión
            </CardTitle>
            <CardDescription>
              Acceso exclusivo para el cuerpo técnico del equipo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="login-rainbow-bg w-full border-0 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={sendingReset}
              className="mt-4 block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </CardContent>
          <p className="px-6 pb-6 text-center text-sm text-muted-foreground">
            ¿No tienes acceso todavía?{" "}
            <Link href="/solicitar-acceso" className="font-medium underline">
              Solicítalo aquí
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
}
