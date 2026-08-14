"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function TiposGolChart({
  datos,
}: {
  datos: { tipo: string; Favor: number; Contra: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis type="category" dataKey="tipo" width={130} fontSize={11} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Favor" fill="var(--pitch)" radius={[0, 4, 4, 0]} />
          <Bar dataKey="Contra" fill="var(--destructive)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
