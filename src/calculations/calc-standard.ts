// Standard Development calculator:
//
// Key Standard rules:
// - Base FAR (no bonus), zone-based lot coverage
// - Surface car parking required (no bicycle)
// - 5% affordable rental, 15% affordable sale
// - User-selectable AMI levels
// - No grants/subsidies
// - Full property tax from year 1 (NO exemption period)
// - Retail allowed for AMX/BMX zones only
// - Zone-based permitting months
// - Parking income included in PGI
//
// Runs on the shared FAR-pathway pipeline (calc-far-pathway.ts) — Standard
// and Bill 6 differ only in which FAR and lot-coverage rule applies.

import { calcFAR, lotCoverage, ParcelOutput, SliderInputs } from "./calc-shared";
import { runFarPathwaySingle } from "./calc-far-pathway";

// =========================================================
// DEFAULTS
// =========================================================

export const STD_DEFAULT_EQUITY = 0.3;
export const STD_DEFAULT_HEIGHT_LIMIT = 30;
export const STD_DEFAULT_FLOOR_HEIGHT = 10;
export const STD_DEFAULT_LAND_COST = 130;
export const STD_DEFAULT_PERMANENT_RATE = 0.0675;
export const STD_DEFAULT_HOLD_YEARS = 10;

export function calcStandardSingle(sliders: SliderInputs): ParcelOutput {
  return runFarPathwaySingle(sliders, {
    calcFar: calcFAR,
    calcCoverage: lotCoverage,
    defaults: {
      equity: STD_DEFAULT_EQUITY,
      height_limit: STD_DEFAULT_HEIGHT_LIMIT,
      floor_height: STD_DEFAULT_FLOOR_HEIGHT,
      land_cost: STD_DEFAULT_LAND_COST,
      permanent_rate: STD_DEFAULT_PERMANENT_RATE,
      hold_years: STD_DEFAULT_HOLD_YEARS,
    },
  });
}
