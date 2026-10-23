import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCompactRps(rps: number): string {
  if (rps >= 1_000_000) {
    return `${(rps / 1_000_000).toFixed(1)}M r/s`;
  }
  if (rps >= 1_000) {
    const formatted =
      rps % 1_000 === 0
        ? (rps / 1_000).toFixed(0)
        : (rps / 1_000).toFixed(1);
    return `${formatted}k r/s`;
  }
  return `${Math.round(rps)} r/s`;
}

export function formatUsdMonthly(costUsd: number): string {
  return `$${costUsd.toLocaleString("en-US")}/mo`;
}
