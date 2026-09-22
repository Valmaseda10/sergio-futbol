"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface ClipListItem {
  id: string;
  titulo: string;
  fecha: string;
}

export function ClipList({
  clips,
  emptyMessage,
}: {
  clips: ClipListItem[];
  emptyMessage: string;
}) {
  if (clips.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="divide-y rounded-md border">
      {clips.map((v) => (
        <Link
          key={v.id}
          href={`/videos/clips/${v.id}`}
          className="flex items-center gap-3 p-3 hover:bg-muted/50"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{v.titulo}</p>
            <p className="truncate text-xs text-muted-foreground">
              {new Date(`${v.fecha}T00:00:00`).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
