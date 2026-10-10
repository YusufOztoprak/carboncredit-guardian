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
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis unit=" MWh" width={80} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="reportedOk"
            name="Reported"
            stackId="r"
            fill="#0f766e"
          />
          <Bar
            dataKey="reportedAnomaly"
            name="Reported (anomaly)"
            stackId="r"
            fill="#dc2626"
          />
          <Line
            dataKey="expected"
            name="Expected (PVGIS)"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
