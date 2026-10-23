"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MONTHS } from "@/lib/mockData";
import { createProject } from "@/lib/api";

const HONEST = [
  60000, 80000, 115000, 140000, 165000, 180000, 195000, 180000, 145000, 105000,
  70000, 50000,
];
const INFLATED = [
  150000, 160000, 170000, 160000, 175000, 190000, 200000, 190000, 170000,
  160000, 150000, 150000,
];

export default function SubmitProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [capacity, setCapacity] = useState("");
  const [owner, setOwner] = useState("");
  const [months, setMonths] = useState<string[]>(Array(12).fill(""));

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/projects/${created.id}`);
    },
  });

  function setMonth(index: number, value: string) {
    setMonths((prev) => prev.map((m, i) => (i === index ? value : m)));
  }

  function fillSample(kind: "honest" | "inflated") {
    setName(kind === "honest" ? "Honest Solar" : "Inflated Solar");
    setLatitude("38.35");
    setLongitude("38.31");
    setCapacity("1000");
    setMonths((kind === "honest" ? HONEST : INFLATED).map(String));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    mutation.mutate({
      name: name.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      capacity_kwp: Number(capacity),
      owner_address: owner.trim() || address || "",
      monthly_kwh: months.map(Number),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Submit a project
          </h1>
          <p className="text-sm text-slate-500">
            Enter the plant details and 12 months of reported production.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          Fill sample:
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fillSample("honest")}
          >
            Honest
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fillSample("inflated")}
          >
            Inflated
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card space-y-6 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Project name</label>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Latitude</label>
            <input
              className="input"
              type="number"
              step="any"
              min="-90"
              max="90"
              required
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input
              className="input"
              type="number"
              step="any"
              min="-180"
              max="180"
              required
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Capacity (kWp)</label>
            <input
              className="input"
              type="number"
              step="any"
              min="1"
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Owner wallet address</label>
            <input
              className="input"
              placeholder={
                address ?? "0x... (connect your wallet to fill this in)"
              }
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Reported monthly production (kWh)</label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {MONTHS.map((month, i) => (
              <div key={month}>
                <span className="mb-1 block text-xs text-slate-400">
                  {month}
                </span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={months[i]}
                  onChange={(e) => setMonth(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-700">{mutation.error.message}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary"
          >
            {mutation.isPending ? "Submitting..." : "Submit for verification"}
          </button>
        </div>
      </form>
    </div>
  );
}
