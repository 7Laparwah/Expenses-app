import type { LucideIcon } from "lucide-react";
import {
  Car,
  Building2,
  Banknote,
  Landmark,
  User,
  Smile,
  TrendingUp,
  Heart,
  Pill,
  UtensilsCrossed,
  Wallet,
  ShoppingBag,
  Zap,
  Bus,
  Home,
  Smartphone,
  Coffee,
  Gift,
  Circle,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  car: Car,
  building: Building2,
  cash: Banknote,
  landmark: Landmark,
  user: User,
  smile: Smile,
  trend: TrendingUp,
  heart: Heart,
  pill: Pill,
  food: UtensilsCrossed,
  wallet: Wallet,
  bag: ShoppingBag,
  zap: Zap,
  bus: Bus,
  home: Home,
  phone: Smartphone,
  coffee: Coffee,
  gift: Gift,
};

export const ICON_KEYS = Object.keys(MAP);

export function PartyGlyph({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = MAP[icon] ?? Circle;
  return <Icon className={className} strokeWidth={2} />;
}
