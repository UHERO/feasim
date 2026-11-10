// Bill 6 Development calculator:
//
// Key Bill 6 rules:
// - Same Sttandard Development rules except:
// - AMI is now zone-based, with user-selectable AMI levels for affordable units (still 5% rental, 15% sale)
// - Minimum lot area is 5,000 sqft for all zoning values
// - Maximum building are is 60% for all zoning values
//
// Runs on the shared FAR-pathway pipeline (calc-far-pathway.ts) — Bill 6 and
// Standard Development differ only in which FAR and lot-coverage rule applies.

import { calcFarBill6, lotCoverageBill6, ParcelOutput, SliderInputs } from "./calc-shared";
import { runFarPathwaySingle } from "./calc-far-pathway";

// =========================================================
// DEFAULTS
// =========================================================

export const BILL6_DEFAULT_EQUITY = 0.3;
export const BILL6_DEFAULT_HEIGHT_LIMIT = 30;
export const BILL6_DEFAULT_FLOOR_HEIGHT = 10;
export const BILL6_DEFAULT_LAND_COST = 130;
export const BILL6_DEFAULT_PERMANENT_RATE = 0.0675;
export const BILL6_DEFAULT_HOLD_YEARS = 10;

export function calcbill6Single(sliders: SliderInputs): ParcelOutput {
  return runFarPathwaySingle(sliders, {
    calcFar: (zone_class) => calcFarBill6(zone_class),
    calcCoverage: (zone_class) => lotCoverageBill6(zone_class),
    defaults: {
      equity: BILL6_DEFAULT_EQUITY,
      height_limit: BILL6_DEFAULT_HEIGHT_LIMIT,
      floor_height: BILL6_DEFAULT_FLOOR_HEIGHT,
      land_cost: BILL6_DEFAULT_LAND_COST,
      permanent_rate: BILL6_DEFAULT_PERMANENT_RATE,
      hold_years: BILL6_DEFAULT_HOLD_YEARS,
    },
  });
}
