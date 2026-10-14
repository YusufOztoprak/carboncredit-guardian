"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mintProject, verifyProject, type Project } from "@/lib/api";

const btn =
  "rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

export default function ProjectActions({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["project", String(project.id)] });
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

  const v = project.latest_verification;
  const txHash =
    mint.data && typeof mint.data.tx_hash === "string" ? mint.data.tx_hash : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        <button
          className={`${btn} bg-teal-700 hover:bg-teal-800`}
          disabled={verify.isPending}
          onClick={() => verify.mutate()}
        >
          {verify.isPending ? "Verifying..." : v ? "Re-run verification" : "Run verification"}
        </button>

        {v?.passed && (
          <button
            className={`${btn} bg-slate-800 hover:bg-slate-900`}
            disabled={mint.isPending}
            onClick={() => mint.mutate()}
          >
            {mint.isPending ? "Minting..." : "Mint credits"}
          </button>
        )}
      </div>

      {verify.isError && <p className="mt-3 text-sm text-red-700">{verify.error.message}</p>}
      {mint.isError && <p className="mt-3 text-sm text-red-700">{mint.error.message}</p>}
      {mint.isSuccess && (
        <p className="mt-3 text-sm text-green-700">
          Mint request sent.{" "}
          {txHash && (
            <a
              className="underline"
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