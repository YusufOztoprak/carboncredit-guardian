import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import VerificationChart from "@/components/VerificationChart";
import { MONTHS, mockProjects } from "@/lib/mockData";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = mockProjects.find((p) => p.id === Number(id));
  if (!project) notFound();

  const totalReported = sum(project.reportedMwh);
  const totalExpected = sum(project.expectedMwh);
  const exceeds = totalReported > project.physicalLimitMwh;
  const anomalyNames =
    project.anomalyMonths.map((i) => MONTHS[i]).join(", ") || "None";

  const card = "rounded-lg border border-slate-200 bg-white p-4";

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-teal-800 hover:underline">
        &larr; All projects
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-slate-600">
          {project.location} &middot; {project.capacityKw} kW
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}>
          <p className="text-xs text-slate-500">Status</p>
          <div className="mt-1">
            <StatusBadge status={project.status} />
          </div>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Risk score</p>
          <p className="mt-1 text-2xl font-semibold">{project.riskScore}</p>
        </div>
        <div className={card}>
          <p className="text-xs text-slate-500">Mint status</p>
          <p className="mt-1 text-lg font-medium capitalize">
            {project.mintStatus}
          </p>
        </div>
      </div>

      <div className={card}>
        <h2 className="mb-3 font-semibold">Expected vs reported production</h2>
        <VerificationChart
          expected={project.expectedMwh}
          reported={project.reportedMwh}
          anomalyMonths={project.anomalyMonths}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <h2 className="mb-2 font-semibold">Layer 1: physical check</h2>
          <p className="text-sm">
            Reported total: <b>{totalReported} MWh</b>
          </p>
          <p className="text-sm">
            Expected total: <b>{totalExpected} MWh</b>
          </p>
          <p className="text-sm">
            Physical limit: <b>{project.physicalLimitMwh} MWh</b>
          </p>
          <p
            className={`mt-2 text-sm font-medium ${exceeds ? "text-red-700" : "text-green-700"}`}
          >
            {exceeds
              ? "Claim exceeds what is physically possible"
              : "Within the physical limit"}
          </p>
        </div>
        <div className={card}>
          <h2 className="mb-2 font-semibold">Layer 2: anomaly detection</h2>
          <p className="text-sm">
            Flagged months: <b>{anomalyNames}</b>
          </p>
        </div>
      </div>
    </div>
  );
}
