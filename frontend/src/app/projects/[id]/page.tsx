"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import VerificationChart from "@/components/VerificationChart";
import ProjectActions from "@/components/ProjectActions";
import ErrorBox from "@/components/ErrorBox";
import Skeleton from "@/components/Skeleton";
import CopyButton from "@/components/CopyButton";
import { MONTHS } from "@/lib/mockData";
import { getProject, kwhToMwh, riskScore } from "@/lib/api";
import { shortAddr } from "@/lib/format";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
  });

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-80" />
      </div>
    );

  if (isError || !project)
    return (
      <ErrorBox
        message={error?.message ?? "Project not found."}
        onRetry={() => refetch()}
      />
    );

  const v = project.latest_verification;
  const diff = v
    ? ((v.reported_kwh_total - v.expected_kwh_total) / v.expected_kwh_total) *
      100
    : 0;
  const score = v ? riskScore(v.risk_score_bp) : 0;
  const scoreColor =
    score < 30
      ? "text-emerald-700"
      : score < 60
        ? "text-amber-700"
        : "text-red-700";

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
        &larr; Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            #{project.id} &middot; {project.latitude.toFixed(2)},{" "}
            {project.longitude.toFixed(2)} &middot;{" "}
            {project.capacity_kwp.toLocaleString()} kWp &middot; Owner{" "}
            {shortAddr(project.owner_address)}{" "}
            <CopyButton value={project.owner_address} />
          </p>
        </div>
        <Link href={`/verify/${project.id}`} className="btn btn-secondary">
          Public page
        </Link>
      </div>

      <ProjectActions project={project} />

      {!v ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This project has not been verified yet. Run verification to see the
          result.
        </div>
      ) : (
        <>
          <div className="card grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-slate-200">
            <div className="p-4">
              <p className="text-xs text-slate-500">Risk score</p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums ${scoreColor}`}
              >
                {score}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500">Avoided CO2</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {v.avoided_tco2.toLocaleString()} t
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500">Reported</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {kwhToMwh(v.reported_kwh_total).toFixed(0)} MWh
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500">Vs expected</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {diff > 0 ? "+" : ""}
                {diff.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Monthly production (MWh)</h2>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {v.anomaly_months.length > 0 ? (
                  <>
                    <span className="text-slate-500">Flagged:</span>
                    {v.anomaly_months.map((m) => (
                      <span
                        key={m}
                        className="rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-700"
                      >
                        {MONTHS[m - 1]}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-slate-500">No anomalous months</span>
                )}
              </div>
            </div>
            <VerificationChart
              expected={v.expected_monthly_kwh.map(kwhToMwh)}
              reported={project.monthly_kwh.map(kwhToMwh)}
              anomalyMonths={v.anomaly_months.map((m) => m - 1)}
            />
          </div>

          <div
            className={`rounded-xl border p-4 text-sm font-medium ${
              v.passed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {v.passed
              ? "Passed verification. This project is eligible for minting."
              : "Flagged for review. No credits can be minted until it passes."}
          </div>
        </>
      )}
    </div>
  );
}
