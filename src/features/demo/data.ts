import type {
  Metrics,
  PriorityOffer,
  TimelineItem,
} from "@/features/dashboard/types";
import { needsFollowup } from "@/lib/validation";
export const demoNow = new Date("2026-11-12T12:00:00Z");
export type DemoOffer = PriorityOffer & {
  created_at: string;
  notes: string;
  contact: string;
  first_response_at: string | null;
  closed_at: string | null;
};
const examples: Omit<DemoOffer, "created_at">[] = [
  {
    id: "oak-design",
    title: "Workspace design proposal",
    customer: "Oak & Stone Studio",
    amount: "12500.0000",
    currency: "EUR",
    status: "sent",
    sent_at: "2026-10-26",
    contact: "Alex Rivers (fictional)",
    first_response_at: null,
    closed_at: null,
    notes:
      "Fictional example: discuss the second-floor layout before confirming scope.",
  },
  {
    id: "north-service",
    title: "Quarterly service package",
    customer: "North Trail Supply",
    amount: "8750.0000",
    currency: "EUR",
    status: "sent",
    sent_at: "2026-11-02",
    contact: "Sam Field (fictional)",
    first_response_at: null,
    closed_at: null,
    notes:
      "Fictional example: purchasing team is reviewing the service schedule.",
  },
  {
    id: "willow-launch",
    title: "Launch support retainer",
    customer: "Willow Works",
    amount: "24000.0000",
    currency: "RON",
    status: "sent",
    sent_at: "2026-11-04",
    contact: "Robin Vale (fictional)",
    first_response_at: null,
    closed_at: null,
    notes: "Fictional example: a friendly follow-up is worth considering.",
  },
  {
    id: "harbor-audit",
    title: "Operations review",
    customer: "Harbor Paper Co.",
    amount: "4200.0000",
    currency: "EUR",
    status: "replied",
    sent_at: "2026-11-06",
    contact: "Casey Moon (fictional)",
    first_response_at: "2026-11-08",
    closed_at: null,
    notes: "Fictional example: customer asked for a revised timeline.",
  },
  {
    id: "moss-annual",
    title: "Annual support agreement",
    customer: "Moss & Finch",
    amount: "16800.0000",
    currency: "EUR",
    status: "won",
    sent_at: "2026-10-16",
    contact: "Taylor Brook (fictional)",
    first_response_at: "2026-10-20",
    closed_at: "2026-11-01",
    notes: "Fictional, manually confirmed won offer. No actual sale occurred.",
  },
  {
    id: "cedar-training",
    title: "Team training program",
    customer: "Cedar House",
    amount: "12000.0000",
    currency: "RON",
    status: "won",
    sent_at: "2026-10-19",
    contact: "Drew Lake (fictional)",
    first_response_at: null,
    closed_at: "2026-11-03",
    notes: "Fictional training engagement.",
  },
  {
    id: "birch-pilot",
    title: "Pilot engagement",
    customer: "Birch Systems",
    amount: "3000.0000",
    currency: "EUR",
    status: "lost",
    sent_at: "2026-10-21",
    contact: "Jamie Hill (fictional)",
    first_response_at: null,
    closed_at: "2026-11-02",
    notes: "Fictional example: timing was not right.",
  },
  {
    id: "fern-next",
    title: "Discovery workshop",
    customer: "Fern Collective",
    amount: "2250.0000",
    currency: "EUR",
    status: "draft",
    sent_at: "",
    contact: "Morgan Reed (fictional)",
    first_response_at: null,
    closed_at: null,
    notes: "Fictional draft, not sent.",
  },
  {
    id: "spruce-setup",
    title: "Workspace onboarding",
    customer: "Spruce Studio",
    amount: "7500.0000",
    currency: "RON",
    status: "sent",
    sent_at: "2026-11-10",
    contact: "Quinn Ash (fictional)",
    first_response_at: null,
    closed_at: null,
    notes: "Fictional new offer. Not yet due for follow-up.",
  },
];
export const demoOffers: DemoOffer[] = examples.map((o, i) => ({
  ...o,
  created_at: [
    "2026-10-25",
    "2026-11-01",
    "2026-11-03",
    "2026-11-05",
    "2026-10-15",
    "2026-10-18",
    "2026-10-20",
    "2026-11-12",
    "2026-11-09",
  ][i],
}));
export function demoMetrics(offers: DemoOffer[]): Metrics {
  const counts: Record<string, number> = {};
  const totals = new Map<string, { open: bigint; won: bigint }>();
  const aging: Record<string, number> = {};
  for (const o of offers) {
    counts[o.status] = (counts[o.status] || 0) + 1;
    const v = totals.get(o.currency) || { open: 0n, won: 0n };
    const units = BigInt(o.amount.replace(".", ""));
    if (["sent", "replied"].includes(o.status)) v.open += units;
    if (o.status === "won") v.won += units;
    totals.set(o.currency, v);
    if (o.status === "sent") {
      const days = Math.floor(
        (demoNow.getTime() - Date.parse(o.sent_at)) / 86400000,
      );
      const bucket =
        days < 7 ? "0–6" : days < 14 ? "7–13" : days < 30 ? "14–29" : "30+";
      aging[bucket] = (aging[bucket] || 0) + 1;
    }
  }
  const decimal = (v: bigint) =>
    `${v / 10000n}.${String(v % 10000n).padStart(4, "0")}`;
  return {
    total: offers.length,
    counts,
    followup: offers.filter((o) => needsFollowup(o, 7, demoNow)).length,
    waiting: counts.sent || 0,
    values: [...totals].map(([currency, v]) => ({
      currency,
      open: decimal(v.open),
      won: decimal(v.won),
    })),
    aging,
    trends: Object.entries(
      offers.reduce<Record<string, number>>((acc, o) => {
        const key = o.created_at.slice(0, 7) + "|" + o.status;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        month: key.split("|")[0],
        status: key.split("|")[1],
        count,
      })),
    imported: 0,
  };
}
export const demoActivity: TimelineItem[] = [
  {
    id: "a1",
    description:
      "Noted a request for revised delivery dates · Harbor Paper Co.",
    type: "note",
    occurred_at: "2026-11-12T09:30:00Z",
  },
  {
    id: "a2",
    description: "Recorded a conversation about the scope · Oak & Stone Studio",
    type: "call_logged",
    occurred_at: "2026-11-11T14:00:00Z",
  },
  {
    id: "a3",
    description: "sent → won · Cedar House",
    type: "status_change",
    occurred_at: "2026-11-03T11:00:00Z",
  },
];
