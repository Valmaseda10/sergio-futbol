"use client";

// Vista visual del resumen de un tagueo: un gráfico de barras horizontal
// con el recuento de cada categoría, cada una con su propio color y
// ordenadas de más a menos tocada — más fácil de leer de un vistazo que una
// lista con el número al lado.

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TagueoResumenChart({
  datos,
}: {
  datos: { nombre: string; color: string; cuenta: number }[];
}) {
  const altura = Math.max(120, datos.length * 36);

  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ left: 16, right: 24 }}>
          <XAxis type="number" allowDecimals={false} fontSize={12} hide />
          <YAxis type="category" dataKey="nombre" width={110} fontSize={12} />
          <Tooltip />
          <Bar dataKey="cuenta" name="Veces" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 12 }}>
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
