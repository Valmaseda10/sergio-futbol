"use client";

import { CapitanesPartidos } from "@/components/partidos/capitanes-partidos";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function CapitanesPage() {
  return <CapitanesPartidos hoy={hoyISO()} />;
}
