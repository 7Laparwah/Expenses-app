import type { LedgerSnapshot } from "./types";

const iso = (y: number, m: number, d: number, hh: number, mm: number) =>
  new Date(y, m - 1, d, hh, mm, 0).toISOString();

export function createSeed(): LedgerSnapshot {
  const parties = [
    { id: "auto", name: "Auto", icon: "car", color: "#F59E0B", kind: "category" as const },
    { id: "office", name: "office Expence", icon: "building", color: "#60A5FA", kind: "category" as const },
    { id: "other-income", name: "Other income", icon: "cash", color: "#34D399", kind: "category" as const },
    { id: "other-investment", name: "Other investment", icon: "cash", color: "#F472B6", kind: "savings" as const },
    { id: "emi", name: "Post office EMI", icon: "landmark", color: "#FB923C", kind: "category" as const },
    { id: "ritik", name: "Ritik", icon: "user", color: "#F97316", kind: "person" as const },
    { id: "self", name: "Self", icon: "smile", color: "#A78BFA", kind: "person" as const },
    { id: "adarsh", name: "Adarsh", icon: "user", color: "#FDBA74", kind: "person" as const },
    { id: "mf", name: "Mutual fund", icon: "trend", color: "#FB7185", kind: "savings" as const },
    { id: "ritesh", name: "Ritesh", icon: "user", color: "#F9A8D4", kind: "person" as const },
    { id: "mammi", name: "Mammi", icon: "heart", color: "#F472B6", kind: "person" as const },
    { id: "medicine", name: "Medicine", icon: "pill", color: "#4ADE80", kind: "category" as const },
    { id: "food", name: "Food", icon: "food", color: "#FACC15", kind: "category" as const },
    { id: "salary", name: "Salary", icon: "wallet", color: "#34D399", kind: "category" as const },
    { id: "grocery", name: "Grocery", icon: "bag", color: "#2DD4BF", kind: "category" as const },
    { id: "electric", name: "Electricity", icon: "zap", color: "#FBBF24", kind: "category" as const },
  ];

  const accounts = [
    { id: "cash", name: "Cash", color: "#4ADE80" },
    { id: "upi", name: "UPI", color: "#A78BFA" },
  ];

  const e = (
    id: string,
    type: "payment" | "receive" | "transfer",
    amount: number,
    partyId: string,
    accountId: string,
    date: string,
    notes: string,
  ) => ({ id, type, amount, partyId, accountId, date, notes });

  const entries = [
    e("e1", "receive", 18500, "salary", "upi", iso(2026, 4, 1, 9, 10), "April salary"),
    e("e2", "payment", 4115, "emi", "upi", iso(2026, 4, 5, 8, 1), "EMI April"),
    e("e3", "receive", 18500, "salary", "upi", iso(2026, 5, 1, 9, 12), "May salary"),
    e("e4", "payment", 4115, "emi", "upi", iso(2026, 5, 5, 8, 2), "EMI May"),
    e("e5", "receive", 18500, "salary", "upi", iso(2026, 6, 1, 9, 5), "June salary"),
    e("e6", "payment", 4115, "emi", "upi", iso(2026, 6, 5, 8, 4), "EMI June"),
    e("e7", "transfer", 4000, "mf", "upi", iso(2026, 6, 8, 11, 0), "SIP June"),
    e("e8", "receive", 18500, "salary", "upi", iso(2026, 7, 1, 9, 8), "July salary"),
    e("e9", "payment", 4115, "emi", "upi", iso(2026, 7, 5, 8, 1), "EMI July"),
    e("e10", "transfer", 4000, "mf", "upi", iso(2026, 7, 8, 11, 0), "SIP July"),
    e("e11", "payment", 2200, "ritik", "upi", iso(2026, 7, 18, 19, 22), "Lent to Ritik"),
    e("e12", "receive", 18500, "salary", "upi", iso(2026, 8, 1, 9, 4), "August salary"),
    e("e13", "payment", 4115, "emi", "upi", iso(2026, 8, 5, 8, 3), "EMI August"),
    e("e14", "transfer", 4000, "mf", "upi", iso(2026, 8, 8, 11, 20), "SIP August"),
    e("e15", "payment", 1860, "self", "upi", iso(2026, 8, 12, 14, 10), "Personal spend"),
    e("e16", "payment", 940, "adarsh", "upi", iso(2026, 8, 20, 16, 40), "Adarsh"),
    e("e17", "receive", 12500, "salary", "upi", iso(2026, 9, 1, 9, 6), "September advance"),
    e("e18", "payment", 4115, "emi", "upi", iso(2026, 9, 5, 8, 12), "EMI September"),
    e("e19", "payment", 2300, "ritik", "upi", iso(2026, 9, 6, 13, 44), "Sent to Ritik"),
    e("e20", "payment", 1929, "self", "upi", iso(2026, 9, 7, 18, 2), "Self transfer out"),
    e("e21", "payment", 957, "adarsh", "upi", iso(2026, 9, 8, 11, 15), "Adarsh"),
    e("e22", "transfer", 838, "mf", "upi", iso(2026, 9, 8, 11, 20), "SIP September"),
    e("e23", "payment", 479, "ritesh", "upi", iso(2026, 9, 9, 20, 8), "Ritesh"),
    e("e24", "payment", 359, "mammi", "upi", iso(2026, 9, 10, 12, 30), "Mammi"),
    e("e25", "payment", 260, "medicine", "cash", iso(2026, 9, 10, 17, 5), "Pharmacy"),
    e("e26", "payment", 90, "food", "cash", iso(2026, 9, 11, 13, 10), "Lunch"),
    e("e27", "payment", 120, "auto", "cash", iso(2026, 9, 12, 9, 40), "Office auto"),
    e("e28", "payment", 50, "food", "cash", iso(2026, 9, 12, 14, 22), "Snacks"),
    e("e29", "transfer", 200, "other-investment", "cash", iso(2026, 9, 13, 11, 20), "Gullak me"),
    e("e30", "receive", 200, "other-income", "cash", iso(2026, 9, 13, 11, 21), "Pent me mile"),
    e("e31", "payment", 50, "office", "cash", iso(2026, 9, 13, 10, 17), "Chai ke liye pay kiye"),
    e("e32", "payment", 40, "medicine", "upi", iso(2026, 9, 14, 19, 5), "Tablets"),
    e("e33", "payment", 30, "office", "cash", iso(2026, 9, 14, 10, 18), "Chai ke liye pay kiye"),
    e("e34", "payment", 40, "auto", "cash", iso(2026, 9, 15, 10, 18), "Auto ke liye pay kiye 1 km"),
    e("e35", "payment", 30, "office", "cash", iso(2026, 9, 15, 10, 18), "Chai ke liye pay kiye"),
  ];

  const goals = [
    {
      id: "g-auto",
      name: "Auto",
      icon: "car",
      color: "#F59E0B",
      partyId: "auto",
      targetAmount: 500,
      targetDate: iso(2026, 9, 30, 23, 59),
      status: "active" as const,
    },
    {
      id: "g-med",
      name: "Medicine",
      icon: "pill",
      color: "#34D399",
      partyId: "medicine",
      targetAmount: 2000,
      targetDate: iso(2026, 9, 30, 23, 59),
      status: "active" as const,
    },
    {
      id: "g-food",
      name: "Food",
      icon: "food",
      color: "#F59E0B",
      partyId: "food",
      targetAmount: 500,
      targetDate: iso(2026, 9, 30, 23, 59),
      status: "active" as const,
    },
  ];

  return {
    parties,
    accounts,
    entries,
    goals,
    settings: {
      displayName: "",
      theme: "dark",
      monthlyBudget: 27920,
      savingsTarget: 6000,
      notifications: true,
      biometric: true,
      pin: null,
      hideBalances: false,
      voiceParsing: true,
    },
  };
}
