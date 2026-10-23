"use client";

import { useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import StatusBadge from "@/components/StatusBadge";
import ErrorBox from "@/components/ErrorBox";
import Skeleton from "@/components/Skeleton";
import {
  getHistory,
  getProject,
  normalizeHistory,
  parseHistoryTotals,
  riskScore,
} from "@/lib/api";
import { CARBON_CREDIT_ADDRESS } from "@/lib/contract";
import { shortAddr } from "@/lib/format";

const dot: Record<string, string> = {
  minted: "bg-emerald-500",
  transferred: "bg-brand-500",
  retired: "bg-red-500",
  other: "bg-slate-400",
};

function fmtDate(value?: string) {
  if (!value) return "";
  const d = isNaN(Number(value))
    ? new Date(value)
    : new Date(Number(value) * 1000);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

const subscribe = () => () => {};

export default function PublicVerificationPage() {
  const { id } = useParams<{ id: string }>();

  const url = useSyncExternalStore(
    subscribe,
    () => window.location.href,
    () => "",
  );

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
  });
  const history = useQuery({
    queryKey: ["history", id],
    queryFn: async () => {
      const raw = await getHistory(id);
      return { events: normalizeHistory(raw), totals: parseHistoryTotals(raw) };
    },
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
  const events = history.data?.events ?? [];
  const totals = history.data?.totals;
  const minted = totals?.minted ?? 0;
  const retired = totals?.retired ?? 0;
  const outstanding = totals?.outstanding ?? 0;

  const lifecycle =
    minted > 0 && outstanding === 0
      ? {
          text: "Fully retired. These credits can never be resold.",
          style: "border-red-200 bg-red-50 text-red-800",
        }
      : retired > 0
        ? {
            text: `${retired} tonnes retired. ${outstanding} tonnes are still active.`,
            style: "border-amber-200 bg-amber-50 text-amber-800",
          }
        : minted > 0
          ? {
              text: `Active. ${outstanding} tonnes outstanding, none retired yet.`,
              style: "border-emerald-200 bg-emerald-50 text-emerald-800",
            }
          : {
              text: "No credits minted yet.",
              style: "border-slate-200 bg-slate-50 text-slate-700",
            };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Credit verification
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
            <StatusBadge status={p.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {p.latitude.toFixed(2)}, {p.longitude.toFixed(2)} &middot;{" "}
            {p.capacity_kwp.toLocaleString()} kWp
            {v && (
              <>
                {" "}
                &middot; Risk score {riskScore(v.risk_score_bp)} &middot;
                Avoided CO2 {v.avoided_tco2.toLocaleString()} t
              </>
            )}
          </p>
        </div>
        {url && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <QRCodeSVG value={url} size={104} />
            <p className="mt-1.5 text-xs text-slate-500">Scan to verify</p>
          </div>
        )}
      </div>

      <div
        className={`rounded-xl border p-4 text-sm font-medium ${lifecycle.style}`}
      >
        {lifecycle.text}
      </div>

      {totals && (
        <div className="card grid grid-cols-2 sm:grid-cols-4 sm:divide-x sm:divide-slate-200">
          {[
            ["Minted", totals.minted],
            ["Transferred", totals.transferred],
            ["Retired", totals.retired],
            ["Outstanding", totals.outstanding],
          ].map(([label, value]) => (
            <div key={label} className="p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {totals?.syncError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          The latest chain sync reported a problem, so recent events may be
          missing: {totals.syncError}
        </p>
      )}

      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Credit history</h2>
        {history.isLoading ? (
          <p className="text-sm text-slate-500">Loading history...</p>
        ) : history.isError ? (
          <p className="text-sm text-red-700">
            Could not load the history: {history.error?.message}
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">
            No events recorded for this credit yet.
          </p>
        ) : (
          <ol className="relative space-y-5 border-l border-slate-200 pl-5">
            {events.map((e, i) => (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dot[e.type]}`}
                />
                <p className="text-sm">
                  <span className="font-semibold capitalize">{e.type}</span>
                  {e.amount && (
                    <span className="ml-2 tabular-nums">{e.amount} t</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {(e.from || e.to) && (
                    <>
                      {e.from ? shortAddr(e.from) : "mint"} &rarr;{" "}
                      {e.to ? shortAddr(e.to) : "burned"} &middot;{" "}
                    </>
                  )}
                  {e.beneficiary && <>for {e.beneficiary} </>}
                  {e.reason && <>({e.reason}) &middot; </>}
                  {e.time && <>{fmtDate(e.time)} &middot; </>}
                  {(e.explorerUrl || e.txHash) && (
                    <a
                      className="font-medium text-brand-600 hover:underline"
                      href={
                        e.explorerUrl ??
                        `https://sepolia.etherscan.io/tx/${e.txHash}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      tx
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="text-xs text-slate-500">
        On-chain contract (Sepolia):{" "}
        <a
          className="font-medium text-brand-600 hover:underline"
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
