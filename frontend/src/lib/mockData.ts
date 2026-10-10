export type Status = "verified" | "flagged" | "rejected";
export type MintStatus = "minted" | "not minted";

export type Project = {
  id: number;
  name: string;
  location: string;
  capacityKw: number;
  status: Status;
  riskScore: number;
  mintStatus: MintStatus;
  physicalLimitMwh: number; // yearly maximum from the physical check
  expectedMwh: number[]; // 12 values, Jan to Dec
  reportedMwh: number[]; // 12 values, Jan to Dec
  anomalyMonths: number[]; // month indexes, 0 = Jan
};

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const mockProjects: Project[] = [
  {
    id: 1,
    name: "Sunrise Solar Farm",
    location: "Abuja, Nigeria",
    capacityKw: 500,
    status: "verified",
    riskScore: 12,
    mintStatus: "minted",
    physicalLimitMwh: 830,
    expectedMwh: [62, 66, 74, 76, 72, 64, 58, 56, 60, 68, 70, 64],
    reportedMwh: [60, 64, 72, 75, 70, 62, 57, 55, 58, 66, 68, 62],
    anomalyMonths: [],
  },
  {
    id: 2,
    name: "GreenPeak Solar",
    location: "Lagos, Nigeria",
    capacityKw: 500,
    status: "rejected",
    riskScore: 91,
    mintStatus: "not minted",
    physicalLimitMwh: 830,
    expectedMwh: [62, 66, 74, 76, 72, 64, 58, 56, 60, 68, 70, 64],
    reportedMwh: [70, 72, 80, 84, 92, 95, 98, 96, 90, 80, 76, 70],
    anomalyMonths: [4, 5, 6, 7, 8],
  },
  {
    id: 3,
    name: "Savanna Rooftop Array",
    location: "Kaduna, Nigeria",
    capacityKw: 480,
    status: "flagged",
    riskScore: 58,
    mintStatus: "not minted",
    physicalLimitMwh: 800,
    expectedMwh: [58, 62, 70, 72, 68, 60, 54, 52, 56, 64, 66, 60],
    reportedMwh: [57, 62, 71, 73, 69, 61, 78, 76, 57, 63, 65, 59],
    anomalyMonths: [6, 7],
  },
];
