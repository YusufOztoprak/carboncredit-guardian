"use client";

import { useState } from "react";
import { MONTHS } from "@/lib/mockData";

const input =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none";

export default function SubmitProjectPage() {
  const [months, setMonths] = useState<string[]>(Array(12).fill(""));
  const [submitted, setSubmitted] = useState(false);

  function setMonth(index: number, value: string) {
    setMonths((prev) => prev.map((m, i) => (i === index ? value : m)));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true); // mock only: this will call POST /projects on Oct 12-13
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Submit a project</h1>

      {submitted && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Project submitted (mock data). It will be sent to the API once we
          connect the pages.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Project name</label>
          <input className={input} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              className={input}
              required
              placeholder="e.g. Abuja, Nigeria"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Capacity (kW)
            </label>
            <input className={input} type="number" min="1" required />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Reported monthly production (MWh)
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

        <button
          type="submit"
          className="rounded-md bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Submit for verification
        </button>
      </form>
    </div>
  );
}
