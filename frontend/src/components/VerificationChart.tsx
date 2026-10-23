"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { MONTHS } from "@/lib/mockData";

type Props = {
  expected: number[];
  reported: number[];
  anomalyMonths: number[];
};

export default function VerificationChart({
  expected,
  reported,
  anomalyMonths,
}: Props) {
  const data = MONTHS.map((month, i) => {
    const isAnomaly = anomalyMonths.includes(i);
    return {
      month,
      expected: expected[i],
      reportedOk: isAnomaly ? undefined : reported[i],
      reportedAnomaly: isAnomaly ? reported[i] : undefined,
    };
  });

  return (
    <div className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            width={40}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            formatter={(value) => `${Number(value).toFixed(1)} MWh`}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="reportedOk"
            name="Reported"
            stackId="r"
            fill="#2b57de"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="reportedAnomaly"
            name="Reported (anomaly)"
            stackId="r"
            fill="#dc2626"
            radius={[4, 4, 0, 0]}
          />
          <Line
            dataKey="expected"
            name="Expected (PVGIS)"
            stroke="#0f172a"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
