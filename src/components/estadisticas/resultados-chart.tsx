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

export function ResultadosChart({
  datos,
}: {
  datos: { rival: string; Favor: number; Contra: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="rival"
            fontSize={11}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Favor" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Contra" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
