// Unified entry point for UHERO development feasibility analysis.
// Dispatches to per-program calculators and re-exports for consumers.
//
// Architecture:
//   calc-shared.ts    — shared constants, types, helpers (from assumptions.R)
//   calc-bill7.ts     — Bill 7 calculator (ROH Chapter 32)
//   calc-standard.ts  — Standard calculator (from calculator/standard/*.R)
//   calc-tod.ts       — TOD calculator (IPDT/PDT/TOD Special Districts)
//   calc-h201.ts      — 201-H housing
//   calc-bill6.ts     — Bill 6 calculator (ROH Chapter 25, ordinance)
//   calculations.ts   — this file: re-exports + dispatch

import {
  BILL6_DEFAULT_EQUITY,
  BILL6_DEFAULT_FLOOR_HEIGHT,
  BILL6_DEFAULT_HEIGHT_LIMIT,
  BILL6_DEFAULT_HOLD_YEARS,
  BILL6_DEFAULT_LAND_COST,
  BILL6_DEFAULT_PERMANENT_RATE,
  calcbill6Single,
} from "./calc-bill6";
import {
  calcBill7Single,
  DEFAULT_AFFORDABLE_AMI,
  DEFAULT_GRANT_TYPE,
  DEFAULT_HEIGHT_LIMIT,
  DEFAULT_HOLD_YEARS,
  DEFAULT_INCLUDE_RETAIL,
  DEFAULT_LAND_COST,
  DEFAULT_MARKET_AMI,
  DEFAULT_PERMANENT_RATE,
  DEFAULT_RETAIL_RENT,
} from "./calc-bill7";
import {
  calcH201Single,
  H201_DEFAULT_AFFORDABILITY,
  H201_DEFAULT_EQUITY,
  H201_DEFAULT_HEIGHT_LIMIT,
  H201_DEFAULT_HOLD_YEARS,
  H201_DEFAULT_LAND_COST,
  H201_DEFAULT_PERMANENT_RATE,
  H201_DEFAULT_PERMITTING_MO,
  H201_DEFAULT_SALE_SPLIT,
} from "./calc-h201";
import {
  commercialFracByZone,
  getAffordablePrice as getAffordablePriceShared,
  permitsGroundFloorRetail,
  type FeeBasis,
  type ParcelOutput,
  type ProgramId,
  type SliderInputs,
} from "./calc-shared";
import {
  calcStandardSingle,
  STD_DEFAULT_EQUITY,
  STD_DEFAULT_FLOOR_HEIGHT,
  STD_DEFAULT_HEIGHT_LIMIT,
  STD_DEFAULT_HOLD_YEARS,
  STD_DEFAULT_LAND_COST,
  STD_DEFAULT_PERMANENT_RATE,
} from "./calc-standard";
import {
  calcTodSingle,
  TOD_DEFAULT_EQUITY,
  TOD_DEFAULT_HEIGHT_LIMIT,
  TOD_DEFAULT_HOLD_YEARS,
  TOD_DEFAULT_LAND_COST,
  TOD_DEFAULT_PERMANENT_RATE,
  TOD_DEFAULT_ZONE_CLASS,
} from "./calc-tod";

// =========================================================
// RE-EXPORTS
// =========================================================

export type { FeeBasis, ParcelOutput, ProgramId, SliderInputs };
export { getAffordablePriceShared as getAffordablePrice };
export { commercialFracByZone, permitsGroundFloorRetail };
export { calcFarBill6, calcFAR } from "./calc-shared";

// Bill 7 defaults
export {
  DEFAULT_AFFORDABLE_AMI,
  DEFAULT_GRANT_TYPE,
  DEFAULT_HEIGHT_LIMIT,
  DEFAULT_HOLD_YEARS,
  DEFAULT_INCLUDE_RETAIL,
  DEFAULT_LAND_COST,
  DEFAULT_MARKET_AMI,
  DEFAULT_PERMANENT_RATE,
  DEFAULT_RETAIL_RENT,
};

// Standard defaults
export {
  STD_DEFAULT_EQUITY,
  STD_DEFAULT_FLOOR_HEIGHT,
  STD_DEFAULT_HEIGHT_LIMIT,
  STD_DEFAULT_HOLD_YEARS,
  STD_DEFAULT_LAND_COST,
  STD_DEFAULT_PERMANENT_RATE,
};

// TOD defaults
export {
  TOD_DEFAULT_EQUITY,
  TOD_DEFAULT_HEIGHT_LIMIT,
  TOD_DEFAULT_HOLD_YEARS,
  TOD_DEFAULT_LAND_COST,
  TOD_DEFAULT_PERMANENT_RATE,
  TOD_DEFAULT_ZONE_CLASS,
};

// 201H defaults
export {
  H201_DEFAULT_AFFORDABILITY,
  H201_DEFAULT_EQUITY,
  H201_DEFAULT_HEIGHT_LIMIT,
  H201_DEFAULT_HOLD_YEARS,
  H201_DEFAULT_LAND_COST,
  H201_DEFAULT_PERMANENT_RATE,
  H201_DEFAULT_PERMITTING_MO,
  H201_DEFAULT_SALE_SPLIT,
};

// Bill 6 defaults
export {
  BILL6_DEFAULT_EQUITY,
  BILL6_DEFAULT_HEIGHT_LIMIT,
  BILL6_DEFAULT_FLOOR_HEIGHT,
  BILL6_DEFAULT_LAND_COST,
  BILL6_DEFAULT_PERMANENT_RATE,
  BILL6_DEFAULT_HOLD_YEARS,
};

// =========================================================
// DISPATCH
// =========================================================

// The § 21-3.120-2 open-space bonus adds FAR but gives up ground at 5:1, so on
// a lot whose height can't use the extra floor area it only costs space. A
// developer takes it where it pays: run the project with and without it and
// keep the one with the higher residual land value. Where neither pencils,
// keep the bigger building, the one a developer would push to make work.
export function calcSingle(sliders: SliderInputs): ParcelOutput {
  const bonus = sliders.open_space_bonus ?? 0;
  const with_bonus = calcProgram(sliders);
  // TOD without a max_far takes calcFarTod's default, which already counts
  // the bonus, so there is no FAR to compare against
  if (
    bonus <= 0 ||
    sliders.program === "bill7" ||
    (sliders.program === "tod" &&
      sliders.max_far == null &&
      sliders.far_without_bonus == null)
  )
    return { ...with_bonus, open_space_bonus: 0 };
  const without_bonus = calcProgram({
    ...sliders,
    open_space_bonus: 0,
    max_far:
      sliders.far_without_bonus ??
      (sliders.max_far != null
        ? Math.max(0, sliders.max_far - bonus)
        : undefined),
  });
  return prefersWithout(with_bonus, without_bonus)
    ? { ...without_bonus, open_space_bonus: 0 }
    : { ...with_bonus, open_space_bonus: bonus };
}

const rlvOf = (r: ParcelOutput) =>
  Number.isFinite(r.rlv) ? r.rlv : -Infinity;

/** whether the project without the bonus beats the one with it */
function prefersWithout(
  with_bonus: ParcelOutput,
  without_bonus: ParcelOutput
): boolean {
  const a = rlvOf(with_bonus);
  const b = rlvOf(without_bonus);
  if (a > 0 || b > 0) return b > a;
  if (without_bonus.buildable_sqft !== with_bonus.buildable_sqft)
    return without_bonus.buildable_sqft > with_bonus.buildable_sqft;
  return b > a;
}

function calcProgram(sliders: SliderInputs): ParcelOutput {
  switch (sliders.program) {
    case "standard":
      return calcStandardSingle(sliders);
    case "tod":
      return calcTodSingle(sliders);
    case "h201":
      return calcH201Single(sliders);
    case "bill7":
      return calcBill7Single(sliders);
    case "bill6":
    default:
      return calcbill6Single(sliders);
  }
}
