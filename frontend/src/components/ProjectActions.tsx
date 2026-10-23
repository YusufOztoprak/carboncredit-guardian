"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mintProject, verifyProject, type Project } from "@/lib/api";

export default function ProjectActions({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["project", String(project.id)],
    });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const verify = useMutation({
    mutationFn: () => verifyProject(project.id),
    onSuccess: refresh,
  });
  const mint = useMutation({
    mutationFn: () => mintProject(project.id),
    onSuccess: refresh,
  });

  const passed = project.latest_verification?.passed;
  const alreadyMinted = project.status.toLowerCase() === "minted";
  const txHash = mint.data?.tx_hash;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="btn btn-secondary"
          disabled={verify.isPending}
          onClick={() => verify.mutate()}
        >
          {verify.isPending
            ? "Verifying..."
            : project.latest_verification
              ? "Re-run verification"
              : "Run verification"}
        </button>

        {passed && !alreadyMinted && (
          <button
            className="btn btn-primary"
            disabled={mint.isPending || mint.isSuccess}
            onClick={() => mint.mutate()}
          >
            {mint.isPending
              ? "Minting..."
              : mint.isSuccess
                ? "Minted"
                : "Mint credits"}
          </button>
        )}

        {alreadyMinted && (
          <span className="text-sm text-slate-600">
            Credits minted.{" "}
            <Link
              href="/credits"
              className="font-medium text-brand-600 hover:underline"
            >
              See My credits
            </Link>
          </span>
        )}
      </div>

      {verify.isError && (
        <p className="text-sm text-red-700">{verify.error.message}</p>
      )}
      {mint.isError && (
        <p className="text-sm text-red-700">{mint.error.message}</p>
      )}
      {mint.isSuccess && (
        <p className="text-sm text-emerald-700">
          Credits minted.{" "}
          {txHash && (
            <a
              className="font-medium underline"
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          )}
        </p>
      )}
    </div>
  );
}
