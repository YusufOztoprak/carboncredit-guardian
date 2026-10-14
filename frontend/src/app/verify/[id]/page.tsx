"use client";

import { useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import StatusBadge from "@/components/StatusBadge";
import ErrorBox from "@/components/ErrorBox";
import Skeleton from "@/components/Skeleton";
import { getHistory, getProject, normalizeHistory, riskScore } from "@/lib/api";
import { CARBON_CREDIT_ADDRESS } from "@/lib/contract";
import { shortAddr } from "@/lib/format";

const card = "rounded-lg border border-slate-200 bg-white p-4";

const badge: Record<string, string> = {
  minted: "bg-green-100 text-green-800",
  transferred: "bg-blue-100 text-blue-800",
  retired: "bg-red-100 text-red-800",
  other: "bg-slate-100 text-slate-700",
};

const num = (s?: string) => Number(s ?? 0) || 0;

function fmtDate(value?: string) {
  if (!value) return "";
  const d = isNaN(Number(value)) ? new Date(value) : new Date(Number(value) * 1000);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

const subscribe = () => () => {};

export default function PublicVerificationPage() {
  const { id } = useParams<{ id: string }>();

  // Current page URL for the QR code (empty on the server, set in the browser).
  const url = useSyncExternalStore(
    subscribe,
    () => window.location.href,
    () => ""
  );

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
  });
  const history = useQuery({
    queryKey: ["history", id],
    queryFn: async () => normalizeHistory(await getHistory(id)),
  });

  if (project.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
      </div>
    );

  if (project.isError || !project.data)
    return (
      <ErrorBox
        message={project.error?.message ?? "Could not load this project."}
        onRetry={() => project.refetch()}
      />
    );

  const p = project.data;
  const v = p.latest_verification;
  const events = history.data ?? [];
  const minted = events
    .filter((e) => e.type === "minted")
    .reduce((sum, e) => sum + num(e.amount), 0);
  const retired = events
    .filter((e) => e.type === "retired")
    .reduce((sum, e) => sum + num(e.amount), 0);

  const lifecycle =
    minted > 0 && retired >= minted
      ? {
          text: "Fully retired. These credits can never be resold.",
          style: "bg-red-50 text-red-800 border-red-200",
        }
      : retired > 0
      ? {
          text: `${retired} tonnes retired. The rest is still active.`,
          style: "bg-amber-50 text-amber-800 border-amber-200",
        }
      : minted > 0
      ? {
          text: "Active. No credits have been retired yet.",
          style: "bg-green-50 text-green-800 border-green-200",
        }
      : {
          text: "No credits minted yet.",
          style: "bg-slate-50 text-slate-700 border-slate-200",
        };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Credit verification
          </p>
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className="text-sm text-slate-600">
            {p.latitude.toFixed(2)}, {p.longitude.toFixed(2)} &middot;{" "}
            {p.capacity_kwp} kWp
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={p.status} />
            {v && (
              <span className="text-sm text-slate-600">
                Risk score {riskScore(v.risk_score_bp)}
              </span>
            )}
            {v && (
              <span className="text-sm text-slate-600">
                Avoided CO2 {v.avoided_tco2} t
              </span>
            )}
          </div>
        </div>
        {url && (
          <div className="text-center">
            <QRCodeSVG value={url} size={128} />
            <p className="mt-1 text-xs text-slate-500">Scan to verify</p>
          </div>
        )}
      </div>

      <div className={`rounded-lg border p-4 text-sm font-medium ${lifecycle.style}`}>
        {lifecycle.text}
      </div>

      <div className={card}>
        <h2 className="mb-3 font-semibold">Credit history</h2>
        {history.isLoading ? (
          <p className="text-sm text-slate-600">Loading history...</p>
        ) : history.isError ? (
          <p className="text-sm text-red-700">
            Could not load the history: {history.error?.message}
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-600">
            No events recorded for this credit yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((e, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-sm first:border-0 first:pt-0"
              >
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badge[e.type]}`}
                >
                  {e.type}
                </span>
                {e.amount && <b>{e.amount} t</b>}
                {(e.from || e.to) && (
                  <span className="text-slate-600">
                    {shortAddr(e.from)} &rarr; {shortAddr(e.to)}
                  </span>
                )}
                {e.beneficiary && <span>for {e.beneficiary}</span>}
                {e.reason && <span className="text-slate-500">({e.reason})</span>}
                {e.time && <span className="text-slate-500">{fmtDate(e.time)}</span>}
                {e.txHash && (
                  <a
                    className="text-teal-800 underline"
                    href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    tx
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="text-xs text-slate-500">
        On-chain contract (Sepolia):{" "}
        <a
          className="underline"
          href={`https://sepolia.etherscan.io/address/${CARBON_CREDIT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          {shortAddr(CARBON_CREDIT_ADDRESS)}
        </a>
      </p>
    </div>
  );
}