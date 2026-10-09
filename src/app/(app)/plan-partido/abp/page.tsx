"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AbpHojas } from "@/components/plan-partido/abp-hojas";

export default function AbpPage() {
  return (
    <div className="space-y-3">
      <div className="print:hidden">
        <Link
          href="/plan-partido"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Plan de partido
        </Link>
        <h1 className="text-2xl font-semibold">ABP</h1>
      </div>
      <AbpHojas />
    </div>
  );
}
