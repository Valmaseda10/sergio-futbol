"use client";

import { JugadaAbpForm } from "@/components/plan-partido/jugada-abp-form";

export default function NuevaJugadaAbpPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nueva jugada de ABP</h1>
      <JugadaAbpForm />
    </div>
  );
}
