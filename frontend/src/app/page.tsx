"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import { getProjects, riskScore } from "@/lib/api";
import Skeleton from "@/components/Skeleton";
import ErrorBox from "@/components/ErrorBox";

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Submit project
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <p className="text-xs text-slate-500">
            The first request can take up to a minute while the server wakes up.
          </p>
        </div>
      ) : isError ? (
        <ErrorBox
          message={`Could not load projects: ${error.message}`}
          onRetry={() => refetch()}
        />
      ) : data && data.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm">
          No projects yet.{" "}
          <Link href="/projects/new" className="text-teal-800 underline">
            Submit the first one
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Risk score</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/projects/${p.id}`}
                        className="text-teal-800 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {p.latitude.toFixed(2)}, {p.longitude.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{p.capacity_kwp} kWp</td>
                    <td className="px-4 py-3">
                      {p.latest_verification
                        ? riskScore(p.latest_verification.risk_score_bp)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 sm:hidden">
            {data?.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-teal-800">{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {p.capacity_kwp} kWp &middot; risk{" "}
                  {p.latest_verification
                    ? riskScore(p.latest_verification.risk_score_bp)
                    : "—"}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
