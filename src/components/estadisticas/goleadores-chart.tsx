"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function GoleadoresChart({
  datos,
}: {
  datos: { nombre: string; goles: number }[];
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={110}
            fontSize={12}
          />
          <Tooltip />
          <Bar dataKey="goles" name="Goles" fill="var(--grana)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
