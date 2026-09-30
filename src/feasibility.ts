import type { ParcelOutput } from "./calculations/calc-shared";

// Shared Feasibility Model
// scored on the four metrics the feasibility call is actually based on:
// return on cost, residual land value, equity multiple, and levered IRR

export type Level = "poor" | "marginal" | "strong";

export function getLevel(value: number, lo: number, hi: number): Level {
  if (value < lo) return "poor";
  if (value < hi) return "marginal";
  return "strong";
}

// market land price per sqft; 0 when the parcel carries no land basis
export function landPricePerSqft(r: ParcelOutput): number {
  return r.lot_sqft > 0 ? r.dev_land_cost / r.lot_sqft : 0;
}

// supportable land bid as a share of the market land price
export function rlvRatio(r: ParcelOutput): number | null {
  const land = landPricePerSqft(r);
  return isFinite(r.rlv_sqft) && land > 0 ? r.rlv_sqft / land : null;
}

export function rocLevel(r: ParcelOutput): Level | null {
  if (!isFinite(r.dev_roc)) return null;
  // marginal within 100 bps of the benchmark, strong at or above it
  return getLevel(r.dev_roc, r.dev_target_roc - 0.01, r.dev_target_roc);
}

export function rlvLevel(r: ParcelOutput): Level | null {
  const ratio = rlvRatio(r);
  // poor below 90% of the asking price, marginal 90-110%, strong at 110%+
  return ratio == null ? null : getLevel(ratio, 0.9, 1.1);
}

export function equityMultipleLevel(r: ParcelOutput): Level | null {
  // development-grade bands, 2 -2.5
  return isFinite(r.dev_equity_multiple)
    ? getLevel(r.dev_equity_multiple, 2.0, 2.5)
    : null;
}

export function irrLevel(r: ParcelOutput): Level | null {
  // levered IRR over the hold
  return isFinite(r.dev_levered_irr)
    ? getLevel(r.dev_levered_irr, 0.08, 0.12)
    : null;
}

export function scoredLevels(r: ParcelOutput): Level[] {
  return [rocLevel(r), rlvLevel(r), equityMultipleLevel(r), irrLevel(r)].filter(
    (l): l is Level => l !== null
  );
}

// overall verdict: a majority of the scored metrics
export function overallLevel(r: ParcelOutput): Level {
  const levels = scoredLevels(r);
  if (levels.length === 0) return "poor";
  const strong = levels.filter((l) => l === "strong").length;
  const poor = levels.filter((l) => l === "poor").length;
  if (poor >= Math.ceil(levels.length / 2)) return "poor";
  if (poor === 0 && strong >= Math.ceil(levels.length * 0.75)) return "strong";
  return "marginal";
}

export const LEVEL_COLOR: Record<Level, string> = {
  poor: "#ef4444",
  marginal: "#facc15",
  strong: "#22c55e",
};
