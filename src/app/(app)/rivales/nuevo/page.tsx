"use client";

import { RivalForm } from "@/components/rivales/rival-form";

export default function NuevoRivalPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuevo análisis de rival</h1>
      <RivalForm />
    </div>
  );
}
