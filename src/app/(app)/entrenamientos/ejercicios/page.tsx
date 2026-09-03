"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EjerciciosPanel } from "@/components/entrenamientos/ejercicios-panel";

export default function EjerciciosPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/entrenamientos"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Entrenamientos
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Biblioteca de ejercicios</h1>
        <p className="text-sm text-muted-foreground">
          Guarda ejercicios para elegirlos rápido al planificar una sesión, en
          vez de escribirlos de cero cada semana.
        </p>
      </div>
      <EjerciciosPanel />
    </div>
  );
}
