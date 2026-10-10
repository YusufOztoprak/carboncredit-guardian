"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MONTHS } from "@/lib/mockData";
import { createProject } from "@/lib/api";

const input =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none";

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
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Submit a project</h1>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Project name</label>
          <input
            className={input}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Latitude</label>
            <input
              className={input}
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
            <label className="mb-1 block text-sm font-medium">Longitude</label>
            <input
              className={input}
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
            <label className="mb-1 block text-sm font-medium">
              Capacity (kWp)
            </label>
            <input
              className={input}
              type="number"
              step="any"
              min="1"
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Owner wallet address
          </label>
          <input
            className={input}
            placeholder={
              address ?? "0x... (connect your wallet to fill this in)"
            }
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Reported monthly production (kWh)
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MONTHS.map((month, i) => (
              <div key={month}>
                <span className="mb-1 block text-xs text-slate-500">
                  {month}
                </span>
                <input
                  className={input}
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

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {mutation.isPending ? "Submitting..." : "Submit for verification"}
        </button>
      </form>
    </div>
  );
}
