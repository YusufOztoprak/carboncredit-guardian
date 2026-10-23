"use client";

import Link from "next/link";
import { useAccount, useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { CARBON_CREDIT_ADDRESS, carbonCreditAbi } from "@/lib/contract";
import { getProjects } from "@/lib/api";
import CreditActions from "@/components/CreditActions";
import ConnectButton from "@/components/ConnectButton";
import EmptyState from "@/components/EmptyState";
import ErrorBox from "@/components/ErrorBox";
import Skeleton from "@/components/Skeleton";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export default function CreditsPage() {
  const { address, isConnected } = useAccount();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });
  const list = projects ?? [];

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: list.map((p) => ({
      address: CARBON_CREDIT_ADDRESS,
      abi: carbonCreditAbi,
      functionName: "balanceOf" as const,
      args: [address ?? ZERO, BigInt(p.id)] as const,
    })),
    query: { enabled: isConnected && !!address && list.length > 0 },
  });

  const rows = list
    .map((project, i) => ({
      project,
      balance: (data?.[i]?.result as bigint | undefined) ?? BigInt(0),
    }))
    .filter((r) => r.balance > BigInt(0));

  const total = rows.reduce((sum, r) => sum + r.balance, BigInt(0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My credits</h1>
          <p className="text-sm text-slate-500">
            1 credit = 1 tonne of CO2, read live from the Sepolia contract.
          </p>
        </div>
        {isConnected && !isLoading && (
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">
              {total.toString()}
            </p>
            <p className="text-xs text-slate-500">tonnes owned</p>
          </div>
        )}
      </div>

      {!isConnected ? (
        <EmptyState>
          <p>Connect your wallet to see your credits.</p>
          <div className="mt-3 flex justify-center">
            <ConnectButton />
          </div>
        </EmptyState>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : isError ? (
        <ErrorBox
          message="Could not read balances. Check your network and try again."
          onRetry={() => refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState>
          No credits in this wallet yet. They appear here after a verified
          project is minted to this address.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map(({ project, balance }) => (
            <div key={project.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-slate-900 hover:text-brand-700"
                  >
                    {project.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Token ID {project.id} &middot;{" "}
                    <Link
                      href={`/verify/${project.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      Public page
                    </Link>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tabular-nums">
                    {balance.toString()}
                  </p>
                  <p className="text-xs text-slate-500">tonnes CO2</p>
                </div>
              </div>
              <div className="mt-4">
                <CreditActions
                  projectId={project.id}
                  balance={balance}
                  onDone={() => refetch()}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
