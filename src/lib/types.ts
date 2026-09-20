export type EntryType = "payment" | "receive" | "transfer";

export interface Party {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: "person" | "category" | "savings";
}

export interface Account {
  id: string;
  name: string;
  color: string;
}

export interface Entry {
  id: string;
  type: EntryType;
  amount: number;
  partyId: string;
  accountId: string;
  date: string;
  notes: string;
  photo?: string;
  deletedAt?: string;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  partyId: string;
  targetAmount: number;
  targetDate: string;
  status: "active" | "completed" | "ended";
  completedAt?: string;
}

export interface Settings {
  displayName: string;
  theme: "dark" | "light";
  monthlyBudget: number;
  savingsTarget: number;
  notifications: boolean;
  biometric: boolean;
  pin: string | null;
  hideBalances: boolean;
  voiceParsing: boolean;
}

export interface LedgerSnapshot {
  parties: Party[];
  accounts: Account[];
  entries: Entry[];
  goals: Goal[];
  settings: Settings;
}
