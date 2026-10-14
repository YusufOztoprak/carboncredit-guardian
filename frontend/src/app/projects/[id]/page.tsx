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

const card = "rounded-lg border border-slate-200 bg-white p-4";

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
        <Skeleton className="h-24" />
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

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-teal-800 hover:underline">
        &larr; All projects
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-slate-600">
          {project.latitude.toFixed(2)}, {project.longitude.toFixed(2)} &middot;{" "}
          {project.capacity_kwp} kWp
        </p>
        <p className="text-xs text-slate-500">
          Owner {shortAddr(project.owner_address)}{" "}
          <CopyButton value={project.owner_address} />
        </p>
        <Link
          href={`/verify/${project.id}`}
          className="text-sm text-teal-800 underline"
        >
          Public verification page
        </Link>
      </div>

      <ProjectActions project={project} />

      {!v ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This project has not been verified yet. Status:{" "}
          <StatusBadge status={project.status} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={card}>
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={project.status} />
              </div>
            </div>
            <div className={card}>
              <p className="text-xs text-slate-500">Risk score</p>
              <p className="mt-1 text-2xl font-semibold">
                {riskScore(v.risk_score_bp)}
              </p>
            </div>
            <div className={card}>
              <p className="text-xs text-slate-500">Avoided CO2</p>
              <p className="mt-1 text-2xl font-semibold">{v.avoided_tco2} t</p>
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-3 font-semibold">
              Expected vs reported production
            </h2>
            <VerificationChart
              expected={v.expected_monthly_kwh.map(kwhToMwh)}
              reported={project.monthly_kwh.map(kwhToMwh)}
              anomalyMonths={v.anomaly_months}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={card}>
              <h2 className="mb-2 font-semibold">Layer 1: physical check</h2>
              <p className="text-sm">
                Reported total:{" "}
                <b>{kwhToMwh(v.reported_kwh_total).toFixed(1)} MWh</b>
              </p>
              <p className="text-sm">
                Expected total:{" "}
                <b>{kwhToMwh(v.expected_kwh_total).toFixed(1)} MWh</b>
              </p>
              <p className="text-sm">
                Difference:{" "}
                <b>
                  {(
                    ((v.reported_kwh_total - v.expected_kwh_total) /
                      v.expected_kwh_total) *
                    100
                  ).toFixed(1)}
                  %
                </b>
              </p>
              <p
                className={`mt-2 text-sm font-medium ${
                  v.passed ? "text-green-700" : "text-red-700"
                }`}
              >
                {v.passed ? "Verification passed" : "Verification failed"}
              </p>
            </div>
            <div className={card}>
              <h2 className="mb-2 font-semibold">Layer 2: anomaly detection</h2>
              <p className="text-sm">
                Flagged months:{" "}
                <b>
                  {v.anomaly_months.map((i) => MONTHS[i]).join(", ") || "None"}
                </b>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
