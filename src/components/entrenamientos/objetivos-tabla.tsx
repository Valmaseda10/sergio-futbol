"use client";

// Tabla de objetivos de la plantilla (Contenido / Principio / Subprincipio /
// Sub-subprincipio): editor para el formulario y vista para la ficha.

import { Input } from "@/components/ui/input";
import type { ObjetivosTabla, ParPrincipio } from "@/lib/ficha-entrenamiento";

type Setter = (t: ObjetivosTabla) => void;

function clonar(t: ObjetivosTabla): ObjetivosTabla {
  return JSON.parse(JSON.stringify(t)) as ObjetivosTabla;
}

function Campo({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] text-muted-foreground">{etiqueta}</span>
      <Input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </label>
  );
}

function FilaPar({
  titulo,
  valor,
  onChange,
}: {
  titulo: string;
  valor: ParPrincipio;
  onChange: (v: ParPrincipio) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold">{titulo}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Campo
          etiqueta="Principio"
          valor={valor.principio}
          onChange={(v) => onChange({ ...valor, principio: v })}
        />
        <Campo
          etiqueta="Subprincipio"
          valor={valor.subprincipio}
          onChange={(v) => onChange({ ...valor, subprincipio: v })}
        />
        <Campo
          etiqueta="Sub-subprincipio"
          valor={valor.subsubprincipio}
          onChange={(v) => onChange({ ...valor, subsubprincipio: v })}
        />
      </div>
    </div>
  );
}

export function ObjetivosTablaEditor({
  valor,
  onChange,
}: {
  valor: ObjetivosTabla;
  onChange: Setter;
}) {
  function set(mut: (t: ObjetivosTabla) => void) {
    const t = clonar(valor);
    mut(t);
    onChange(t);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold">Psicológico</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Campo
            etiqueta="Contenido"
            valor={valor.psicologico.contenido}
            onChange={(v) => set((t) => (t.psicologico.contenido = v))}
          />
          <Campo
            etiqueta="Principio"
            valor={valor.psicologico.principio}
            onChange={(v) => set((t) => (t.psicologico.principio = v))}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-2">
        <p className="text-xs font-semibold">Táctico</p>
        <Campo
          etiqueta="Contenido (ofensivo y defensivo)"
          valor={valor.tactico.contenido_of_df}
          onChange={(v) => set((t) => (t.tactico.contenido_of_df = v))}
        />
        <FilaPar
          titulo="OF"
          valor={valor.tactico.of}
          onChange={(v) => set((t) => (t.tactico.of = v))}
        />
        <FilaPar
          titulo="DF"
          valor={valor.tactico.df}
          onChange={(v) => set((t) => (t.tactico.df = v))}
        />
        <Campo
          etiqueta="Contenido (transiciones)"
          valor={valor.tactico.contenido_to_td}
          onChange={(v) => set((t) => (t.tactico.contenido_to_td = v))}
        />
        <FilaPar
          titulo="TO"
          valor={valor.tactico.to}
          onChange={(v) => set((t) => (t.tactico.to = v))}
        />
        <FilaPar
          titulo="TD"
          valor={valor.tactico.td}
          onChange={(v) => set((t) => (t.tactico.td = v))}
        />
        <Campo
          etiqueta="Contenido (ABP)"
          valor={valor.tactico.contenido_abp}
          onChange={(v) => set((t) => (t.tactico.contenido_abp = v))}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Campo
            etiqueta="ABP · DF"
            valor={valor.tactico.abp_df}
            onChange={(v) => set((t) => (t.tactico.abp_df = v))}
          />
          <Campo
            etiqueta="ABP · OF"
            valor={valor.tactico.abp_of}
            onChange={(v) => set((t) => (t.tactico.abp_of = v))}
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold">Técnico (OF-DF)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Campo
            etiqueta="Contenido"
            valor={valor.tecnico.contenido}
            onChange={(v) => set((t) => (t.tecnico.contenido = v))}
          />
          <Campo
            etiqueta="DF"
            valor={valor.tecnico.df}
            onChange={(v) => set((t) => (t.tecnico.df = v))}
          />
          <Campo
            etiqueta="OF"
            valor={valor.tecnico.of}
            onChange={(v) => set((t) => (t.tecnico.of = v))}
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold">Físico</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Campo
            etiqueta="Contenido"
            valor={valor.fisico.contenido}
            onChange={(v) => set((t) => (t.fisico.contenido = v))}
          />
          <Campo
            etiqueta="Principio"
            valor={valor.fisico.principio}
            onChange={(v) => set((t) => (t.fisico.principio = v))}
          />
        </div>
      </div>
    </div>
  );
}

// ---- Vista para la ficha: misma tabla que la plantilla -------------------

const ROJO = "#c00000";

const celdaCabecera =
  "border border-neutral-400 bg-neutral-300 px-1 py-0.5 text-center text-[7px] font-bold leading-tight text-neutral-800";
const celdaTexto =
  "border border-neutral-400 bg-neutral-100 px-1 py-0.5 text-center text-[7px] font-semibold leading-tight text-neutral-900";
const celdaRoja =
  "border border-neutral-400 px-1 py-0.5 text-center text-[7px] font-bold leading-tight text-white";

function EtiquetaRoja({
  children,
  className = "",
  rowSpan,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  rowSpan?: number;
  colSpan?: number;
}) {
  return (
    <td
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={`${celdaRoja} ${className}`}
      style={{ backgroundColor: ROJO }}
    >
      {children}
    </td>
  );
}

function Texto({
  children,
  rowSpan,
  colSpan,
}: {
  children: React.ReactNode;
  rowSpan?: number;
  colSpan?: number;
}) {
  return (
    <td rowSpan={rowSpan} colSpan={colSpan} className={celdaTexto}>
      {children}
    </td>
  );
}

function ConLetra({ letra, texto }: { letra: string; texto: string }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <span className="font-bold">{letra}</span>
      <span>{texto}</span>
    </div>
  );
}

export function ObjetivosTablaVista({ tabla }: { tabla: ObjetivosTabla }) {
  const t = tabla.tactico;
  return (
    <table className="w-full table-fixed border-collapse bg-white">
      <colgroup>
        <col style={{ width: "6%" }} />
        <col style={{ width: "7%" }} />
        <col style={{ width: "27%" }} />
        <col style={{ width: "23%" }} />
        <col style={{ width: "19%" }} />
        <col style={{ width: "18%" }} />
      </colgroup>
      <thead>
        <tr>
          <th className="border-0" colSpan={2} />
          <th className={celdaCabecera}>Contenido</th>
          <th className={celdaCabecera}>Principio</th>
          <th className={celdaCabecera}>Subprincipio</th>
          <th className={celdaCabecera}>Sub-subprincipio</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <EtiquetaRoja colSpan={2}>Psicológico</EtiquetaRoja>
          <Texto>{tabla.psicologico.contenido}</Texto>
          <Texto colSpan={3}>{tabla.psicologico.principio}</Texto>
        </tr>

        <tr>
          <EtiquetaRoja rowSpan={5}>
            <span className="inline-block -rotate-90 whitespace-nowrap">Táctico</span>
          </EtiquetaRoja>
          <EtiquetaRoja>OF</EtiquetaRoja>
          <Texto rowSpan={2}>{t.contenido_of_df}</Texto>
          <Texto>{t.of.principio}</Texto>
          <Texto>{t.of.subprincipio}</Texto>
          <Texto>{t.of.subsubprincipio}</Texto>
        </tr>
        <tr>
          <EtiquetaRoja>DF</EtiquetaRoja>
          <Texto>{t.df.principio}</Texto>
          <Texto>{t.df.subprincipio}</Texto>
          <Texto>{t.df.subsubprincipio}</Texto>
        </tr>
        <tr>
          <EtiquetaRoja>TO</EtiquetaRoja>
          <Texto rowSpan={2}>{t.contenido_to_td}</Texto>
          <Texto>{t.to.principio}</Texto>
          <Texto>{t.to.subprincipio}</Texto>
          <Texto>{t.to.subsubprincipio}</Texto>
        </tr>
        <tr>
          <EtiquetaRoja>TD</EtiquetaRoja>
          <Texto>{t.td.principio}</Texto>
          <Texto>{t.td.subprincipio}</Texto>
          <Texto>{t.td.subsubprincipio}</Texto>
        </tr>
        <tr>
          <EtiquetaRoja>ABP</EtiquetaRoja>
          <Texto>{t.contenido_abp}</Texto>
          <Texto>
            <ConLetra letra="DF" texto={t.abp_df} />
          </Texto>
          <Texto colSpan={2}>
            <ConLetra letra="OF" texto={t.abp_of} />
          </Texto>
        </tr>

        <tr>
          <EtiquetaRoja colSpan={2}>Técnico (OF-DF)</EtiquetaRoja>
          <Texto>{tabla.tecnico.contenido}</Texto>
          <Texto>
            <ConLetra letra="DF" texto={tabla.tecnico.df} />
          </Texto>
          <Texto colSpan={2}>
            <ConLetra letra="OF" texto={tabla.tecnico.of} />
          </Texto>
        </tr>

        <tr>
          <EtiquetaRoja colSpan={2}>Físico</EtiquetaRoja>
          <Texto>{tabla.fisico.contenido}</Texto>
          <Texto colSpan={3}>{tabla.fisico.principio}</Texto>
        </tr>
      </tbody>
    </table>
  );
}
