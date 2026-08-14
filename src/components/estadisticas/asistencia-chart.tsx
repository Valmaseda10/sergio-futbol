"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function AsistenciaChart({
  datos,
}: {
  datos: { fecha: string; pctAsistencia: number }[];
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" fontSize={11} />
          <YAxis domain={[0, 100]} unit="%" fontSize={12} />
          <Tooltip formatter={(value) => [`${value}%`, "Asistencia"]} />
          <Line
            type="monotone"
            dataKey="pctAsistencia"
            name="Asistencia"
            stroke="var(--gold)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--gold)", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
