import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { mockProjects } from "@/lib/mockData";

export default function Home() {
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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
            {mockProjects.map((p) => (
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
                <td className="px-4 py-3">{p.location}</td>
                <td className="px-4 py-3">{p.capacityKw} kW</td>
                <td className="px-4 py-3">{p.riskScore}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
