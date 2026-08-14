"use client";

import { RivalScoutingForm } from "@/components/partidos/rival-scouting-form";

export default function NuevoRivalScoutingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuevo análisis de rival</h1>
      <RivalScoutingForm />
    </div>
  );
}
