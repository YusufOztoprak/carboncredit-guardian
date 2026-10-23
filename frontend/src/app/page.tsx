"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import ErrorBox from "@/components/ErrorBox";
import EmptyState from "@/components/EmptyState";
import Skeleton from "@/components/Skeleton";
import { getProjects, riskScore, type Project } from "@/lib/api";

type Filter = "all" | "verified" | "flagged" | "pending";

function category(p: Project): Exclude<Filter, "all"> {
  const v = p.latest_verification;
  if (!v) return "pending";
  return v.passed ? "verified" : "flagged";
}

function riskTone(score: number) {
  if (score < 30) return { bar: "bg-emerald-500", text: "text-emerald-700" };
  if (score < 60) return { bar: "bg-amber-500", text: "text-amber-700" };
  return { bar: "bg-red-500", text: "text-red-700" };
}

export default function Home() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const projects = data ?? [];
  const verified = projects.filter((p) => category(p) === "verified");
  const avoided = verified.reduce(
    (sum, p) => sum + (p.latest_verification?.avoided_tco2 ?? 0),
    0,
  );

  const counts: Record<Filter, number> = {
    all: projects.length,
    verified: verified.length,
    flagged: projects.filter((p) => category(p) === "flagged").length,
    pending: projects.filter((p) => category(p) === "pending").length,
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "verified", label: "Verified" },
    { key: "flagged", label: "Flagged" },
    { key: "pending", label: "Pending" },
  ];

  const shown =
    filter === "all"
      ? projects
      : projects.filter((p) => category(p) === filter);

  const stats = [
    { label: "Projects", value: counts.all.toLocaleString() },
    { label: "Verified", value: counts.verified.toLocaleString() },
    { label: "Flagged", value: counts.flagged.toLocaleString() },
    {
      label: "Avoided CO2 (verified)",
      value: `${Math.round(avoided).toLocaleString()} t`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500">
            Every project is checked before any credit is minted.
          </p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          Submit project
        </Link>
      </div>

      <div className="card grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-slate-200">
        {stats.map((s) => (
          <div key={s.label} className="p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {isLoading ? "-" : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-60">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <p className="text-xs text-slate-500">
            The first request can take up to a minute while the server wakes up.
          </p>
        </div>
      ) : isError ? (
        <ErrorBox
          message={`Could not load projects: ${error.message}`}
          onRetry={() => refetch()}
        />
      ) : projects.length === 0 ? (
        <EmptyState>
          No projects yet.{" "}
          <Link
            href="/projects/new"
            className="font-medium text-brand-600 underline"
          >
            Submit the first one
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Location
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Capacity
                </th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                  Avoided CO2
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No projects in this filter.
                  </td>
                </tr>
              )}
              {shown.map((p) => {
                const v = p.latest_verification;
                const score = v ? riskScore(v.risk_score_bp) : null;
                const tone = score !== null ? riskTone(score) : null;
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-slate-900 hover:text-brand-700"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-slate-500">#{p.id}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {p.latitude.toFixed(2)}, {p.longitude.toFixed(2)}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 tabular-nums md:table-cell">
                      {p.capacity_kwp.toLocaleString()} kWp
                    </td>
                    <td className="px-4 py-3">
                      {tone && score !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${tone.bar}`}
                              style={{
                                width: `${Math.min(100, Math.max(score, 4))}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium tabular-nums ${tone.text}`}
                          >
                            {score}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-700 sm:table-cell">
                      {v ? `${v.avoided_tco2.toLocaleString()} t` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
