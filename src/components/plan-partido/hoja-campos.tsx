"use client";

import { useLayoutEffect, useRef } from "react";

// Textarea que crece con lo que se escribe, para que al imprimir no se corte. Con `llenar` ocupa
// además todo el hueco de su contenedor (se puede escribir en cualquier parte de la casilla).
export function AreaAuto({
  valor,
  onCambio,
  className = "",
  etiqueta,
  llenar = false,
  ajuste = false,
}: {
  valor: string;
  onCambio: (v: string) => void;
  className?: string;
  etiqueta: string;
  llenar?: boolean;
  /** Caja del análisis: al imprimir se reajusta para que todo entre en la página. */
  ajuste?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    function medir() {
      if (!el) return;
      el.style.height = "auto";
      let alto = el.scrollHeight;
      if (llenar && el.parentElement) alto = Math.max(alto, el.parentElement.clientHeight);
      el.style.height = `${alto}px`;
    }
    medir();
    if (!llenar) return;
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [valor, llenar]);
  return (
    <textarea
      ref={ref}
      value={valor}
      rows={1}
      aria-label={etiqueta}
      data-llenar={llenar ? "" : undefined}
      data-ajuste={ajuste ? "" : undefined}
      onChange={(e) => onCambio(e.target.value)}
      className={`block w-full resize-none overflow-hidden bg-transparent px-1.5 py-1 leading-snug outline-none focus:bg-yellow-50 print:focus:bg-transparent ${className}`}
    />
  );
}
