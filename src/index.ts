// @uhero-data/policy-simulator — public entry point.
// Everything the package offers is exported from this file, and nothing else
// is part of its API.
// The model is copied from uhero_analytics (see README, "Source").

// the model: pathway pro formas, inputs/outputs types, defaults, zone helpers
export * from "./calculations";

// constants and helpers the gauge and calculator use directly
export { DEFAULT_TARGET_RETURN, GRANT, zoneName } from "./calculations/calc-shared";

// TOD rules (§ 21-9.100-5): eligibility, PD-T / IPD-T FAR and height, station
// area plan ceilings, open-space bonus
export {
  baseFar,
  calcFarPdt,
  calcFarTod,
  OPEN_SPACE_FAR_CEILING,
  openSpaceBonus,
  residentialUse,
  TOD_ELIGIBLE_DISTRICTS,
  TOD_MAX_FAR,
  TOD_MAX_HEIGHT_FT,
  TOD_MIN_LOT_SQFT,
  TOD_PLAN_STANDARDS,
  todEligible,
  todHeightLimit,
  todHeightPdt,
  todPlanCeiling,
  todUseZone,
  type ResidentialUse,
  type TodPermitRoute,
  type TodPlanStandards,
} from "./calculations/calc-shared";

// BWS water charges: Water System Facilities Charge (WSFC) and new meter cost
export {
  BATHS_BY_UNIT_TYPE,
  calcWaterFees,
  COMMON_AREA_FU,
  FIRE_METER_CHARGE,
  fireMeterSize,
  FU_PER_UNIT,
  livingStories,
  mixFixtureUnits,
  WSFC_MIN_FU,
  WSFC_PER_FU,
  WSFC_WAIVER_UNIT_CAP,
  wsfcCategory,
} from "./calculations/calc-shared";

// real parcels: pathway envelope rules and default assumptions
export * from "./parcels";

// feasibility classifier applied to a model output
export * from "./feasibility";
