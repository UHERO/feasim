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

export function calcSingle(sliders: SliderInputs): ParcelOutput {
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
