"use client";

import { ClubCrest } from "@/components/branding/club-crest";

// El mismo escudo real del club que ya se usaba como marca de agua al
// imprimir (ver PdfWatermark), ahora también de fondo mientras se navega la
// app: fijo, centrado, muy tenue y sin interactividad, detrás de las
// tarjetas — no se aplica en /login ni al imprimir (ese caso ya lo cubre
// PdfWatermark con su propia opacidad).
export function AppWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.05] print:hidden"
    >
      <ClubCrest size={320} />
    </div>
  );
}
