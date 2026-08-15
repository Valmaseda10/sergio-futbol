"use client";

import { useState } from "react";
import { actualizarEquipacionRivalLocal } from "@/app/(app)/rivales/local-actions";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLOR_DEFECTO = "#9ca3af";

function CamisetaIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-14 sm:size-16">
      <path
        d="M9 2C9 3.1 10.3 4 12 4C13.7 4 15 3.1 15 2L20 6L17.5 10L16 8.7V22H8V8.7L6.5 10L4 6L9 2Z"
        fill={color}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PantalonIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-14 sm:size-16">
      <path
        d="M7 2H17V7L15 14H13L12 8L11 14H9L7 7V2Z"
        fill={color}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MediasIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-14 sm:size-16">
      <path
        d="M9 2H15V14C15 14 15 16 17 17C19 18 20 20 19 21C18 22 15 21 13 19C11 17 9 15 9 14V2Z"
        fill={color}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PARTES = [
  { key: "color_camiseta" as const, label: "Camiseta", Icon: CamisetaIcon },
  { key: "color_pantalon" as const, label: "Pantalón", Icon: PantalonIcon },
  { key: "color_medias" as const, label: "Medias", Icon: MediasIcon },
];

type ClaveColor = (typeof PARTES)[number]["key"];

export function EquipacionRival({
  rivalId,
  colorCamiseta,
  colorPantalon,
  colorMedias,
}: {
  rivalId: string;
  colorCamiseta: string | null;
  colorPantalon: string | null;
  colorMedias: string | null;
}) {
  const [valores, setValores] = useState<Record<ClaveColor, string>>({
    color_camiseta: colorCamiseta ?? COLOR_DEFECTO,
    color_pantalon: colorPantalon ?? COLOR_DEFECTO,
    color_medias: colorMedias ?? COLOR_DEFECTO,
  });

  function handleChange(key: ClaveColor, color: string) {
    setValores((prev) => ({ ...prev, [key]: color }));
    actualizarEquipacionRivalLocal(rivalId, { [key]: color });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Equipación</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {PARTES.map(({ key, label, Icon }) => (
            <div key={key} className="flex flex-col items-center gap-2">
              <Icon color={valores[key]} />
              <Label htmlFor={key} className="text-xs">
                {label}
              </Label>
              <input
                id={key}
                type="color"
                value={valores[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="h-8 w-14 cursor-pointer rounded border bg-transparent print:hidden"
                aria-label={`Color de ${label.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
