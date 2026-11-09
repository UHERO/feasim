// =========================================================
// CONSTANTS
// Shared constants, types, and helper functions used by all program calculators.
// =========================================================

// currrently unused as of 2026-08-05, zone-specific hard construction cost per sqft
export const COST_PER_ZONE: Record<string, number> = {
  "A-1": 170.5,
  "A-2": 161.21,
  "A-3": 183.7,
  "AMX-1": 200.0,
  "AMX-2": 266.91,
  "AMX-3": 231.18,
  "R-5": 170.5,
  "B-1": 200.0,
  "B-2": 161.21,
  "BMX-3": 231.18,
  "BMX-4": 231.18,
  Apart: 161.21,
  ApartMix: 161.21,
};

// zone classes that share a low-density treatment (FAR, Bill 6 FAR, excavation depth)
// note: permitting and construction duration use different groupings, see those functions
export const ZONE_GROUPS = {
  lowDensity: ["A-1", "AMX-1", "R-5"],
  // zones permitting ground floor commercial use
  mixedUse: ["AMX-1", "AMX-2", "AMX-3", "BMX-3", "BMX-4", "ApartMix"],
  // Waikiki Special District: Apartment Precinct and Apartment Mixed Use Subprecinct
  waikiki: ["Apart", "ApartMix"],
} satisfies Record<string, string[]>;

// official names for the zone codes above that are shorthand; every other
// code (A-2, BMX-3, …) is already the official district name
const ZONE_NAMES: Record<string, string> = {
  Apart: "Apartment Precinct",
  ApartMix: "Apartment Mixed Use Subprecinct",
};

export function zoneName(zone_class: string): string {
  return ZONE_NAMES[zone_class] ?? zone_class;
}

// function that checks if the selected zone permits ground floor retail
export function permitsGroundFloorRetail(zone_class: string): boolean {
  return ZONE_GROUPS.mixedUse.includes(zone_class);
}

// ground floor commercial fraction of lot area, by zone (ROH Table 21-3.3)
export function commercialFracByZone(zone_class: string): number {
  if (zone_class === "AMX-1") return COMMERCIAL_COVERAGE.commercial1;
  if (zone_class === "AMX-2") return COMMERCIAL_COVERAGE.commercial2;
  if (["AMX-3", "BMX-3", "BMX-4", "ApartMix"].includes(zone_class))
    return COMMERCIAL_COVERAGE.commercial3;
  return 0;
}

// PARK DEDICATION CONSTANTS
// currrently unused as of 2026-08-05, but may be used in future versions of the calculator
// private park build cost per sqft (ground-level amenity)
export const PARK_BUILD_COST_PER_SQFT = 145;
// park dedication minimum land area rule for apartments
export const PARK_SQFT_PER_UNIT = 110;
// park dedication minimum land area rule for special districts
export const PARK_FLOOR_AREA_FRACTION = 0.1;
// park dedication minimum land area = lesser of 110 sqft/unit or 10% of floor area
export function calcParkArea(
  max_units: number,
  buildable_sqft: number
): number {
  return Math.min(
    PARK_SQFT_PER_UNIT * max_units,
    PARK_FLOOR_AREA_FRACTION * buildable_sqft
  );
}
// construction management fee
export const CONSTRUCTION_MGMT_RATE = 0.03;

// retail construction cost premium over residential rate
export const RETAIL_PREMIUM = 15;

// 80% efficiency factor for building
export const EFFICIENCY = 0.8;

// unit mix presets: each maps a mix key to component types + weights (must sum to 1) no longer UNIT_SIZE function
export const UNIT_MIX: Record<string, { type: string; weight: number }[]> = {
  studio_100: [{ type: "studio", weight: 1.0 }],
  studio75_1br25: [
    { type: "studio", weight: 0.75 },
    { type: "one_bb", weight: 0.25 },
  ],
  studio50_1br50: [
    { type: "studio", weight: 0.5 },
    { type: "one_bb", weight: 0.5 },
  ],
  studio25_1br75: [
    { type: "studio", weight: 0.25 },
    { type: "one_bb", weight: 0.75 },
  ],
  one_bb_100: [{ type: "one_bb", weight: 1.0 }],
  one_br50_2br50: [
    { type: "one_bb", weight: 0.5 },
    { type: "two_bb", weight: 0.5 },
  ],
  two_bb_100: [{ type: "two_bb", weight: 1.0 }],
  third_each: [
    { type: "studio", weight: 1 / 3 },
    { type: "one_bb", weight: 1 / 3 },
    { type: "two_bb", weight: 1 / 3 },
  ],
};

// blended average unit size for a mix key (sqft)
export function mixUnitSize(mix_key: string): number {
  const mix = UNIT_MIX[mix_key] ?? UNIT_MIX["one_bb_100"];
  return mix.reduce((sum, m) => sum + (UNIT_SIZE[m.type] ?? 500) * m.weight, 0);
}

// blended rent for a mix key (weighted avg of each component's rentByAmi)
export function mixRentByAmi(ami: string | number, mix_key: string): number {
  const mix = UNIT_MIX[mix_key] ?? UNIT_MIX["one_bb_100"];
  return Math.floor(
    mix.reduce((sum, m) => sum + rentByAmi(ami, m.type) * m.weight, 0)
  );
}

// blended sale price for a mix key (weighted avg of each component's getAffordablePrice)
export function mixAffordablePrice(
  mix_key: string,
  ami: number,
  rate: number
): number {
  const mix = UNIT_MIX[mix_key] ?? UNIT_MIX["one_bb_100"];
  return Math.round(
    mix.reduce(
      (sum, m) => sum + getAffordablePrice(m.type, ami, rate) * m.weight,
      0
    )
  );
}

// unit sizes by type (sqft)
export const UNIT_SIZE: Record<string, number> = {
  studio: 300,
  one_bb: 500,
  two_bb: 700,
  three_bb: 900,
  four_bb: 1200,
};

// map unit type for rent functions
const RENT_HOUSEHOLD: Record<string, number[]> = {
  studio: [1],
  one_bb: [1, 2],
  two_bb: [3],
  three_bb: [4, 5],
  four_bb: [6],
};

// affordable rent = 30% of household income, utilities included (HHFDC guideline)
export const AFFORDABLE_RENT_INCOME_SHARE = 0.3;

export function rentByAmi(ami: string | number, unit_type: string): number {
  const raw = Number(String(ami).replace("ami_", ""));
  const pct = Number.isFinite(raw) ? raw : 50;
  // exact bracket if published; otherwise scale the 50% row (it's linear)
  const row =
    INCOME_LIMITS[pct] ?? INCOME_LIMITS[50].map((v) => (v * pct) / 50);
  const sizes = RENT_HOUSEHOLD[unit_type] ?? RENT_HOUSEHOLD[DEFAULT_UNIT_TYPE];
  const income = sizes.reduce((sum, p) => sum + row[p - 1], 0) / sizes.length;
  // HHFDC publishes these floored, not rounded
  return Math.floor((income * AFFORDABLE_RENT_INCOME_SHARE) / 12);
}

// default unit type
export const DEFAULT_UNIT_TYPE = "one_bb";

// vacancy rates
export const VACANCY = {
  default: 0.126,
  rental: 0.074,
  home: 0.01,
};

// admin income
export const INCOME = {
  application_fee: 50,
  lease_renewal: 200,
};

// operating expense rates
export const EXPENSES = {
  property_mgmt_rate: 0.15,
  property_insurance_unit: 1000,
  liability_insurance_unit: 150,
  monitor_unit: 60,
  // opex as % of EGI, excludes property tax (modeled separately in hold loop)
  opex_ratio: 0.2,
};

// timing assumptions
export const TIMING = {
  stabilization: 3,
  absorption_units_per_month: 20,
  monthly_sale_cap: 20,
  target_occupancy: 0.9,
};

// finance assumptions
export const FINANCING = {
  loan_fee: 0.0075,
  construction_rate: 0.08,
  dev_fee: 0.1,
  contingency: 1.1,
  cost_carried: 0.1,
  equity: 0.1,
  // 4%/yr AMI growth (2015 to 2026 Honolulu MFI CAGR); escalates AMI-capped rents & sale prices to lease-up/sale
  ami_escalation: 1.04,
  // 5.6%/yr construction hard-cost escalation; applied to construction midpoint
  cost_inflation: 1.056,
  disposition_cost: 0.035,
  rpt_residential: 0.0035,
};

// hold strategy assumptions
export const HOLD = {
  amort_years: 30,
  // hold-period rent growth for all units: affordable caps track ami (4%/yr,
  // honolulu mfi 2015-2025), and market rents grew about as fast (zillow
  // honolulu 3.6%/yr since 2016, 4.2%/yr over the last 5 years)
  annual_rent_growth: 0.04,
  // operating expenses trend on their own series rather than as a fixed share of EGI
  annual_opex_growth: 0.035,
  // 2%/yr is the property-tax escalation
  annual_assessment_growth: 0.02,
  exit_cap_spread: 0.005,
  tax_exemption_years: 15,
};

// market cap rate, the same for every zone
export const DEFAULT_CAP_RATE = 0.051;

// required return-on-cost spread over cap rate (150 bps)
export const DEFAULT_TARGET_SPREAD = 0.015;

// land carry rate: annual cost of capital on the land purchase
export const DEFAULT_TARGET_RETURN = 0.115;

// developer profit as a margin on total project cost (dev cost + finance)
export const DEFAULT_PROFIT_MARGIN = 0.15;

// slider override if provided, else the market cap rate
export function resolveCapRate(override?: number): number {
  if (override != null && override > 0) return override;
  return DEFAULT_CAP_RATE;
}

// retail cap rate spread above residential cap rate
export const RETAIL_CAP_SPREAD = 0.015;

// lot coverage fraction by zone class
export const LOT_COVERAGE: Record<string, number> = {
  "A-1": 0.6,
  "AMX-1": 0.6,
  "R-5": 0.6,
  "B-1": 1.0,
  "A-2": 0.5,
  "AMX-2": 0.5,
  "A-3": 0.4,
  "AMX-3": 0.4,
  Apart: 1.0,
  ApartMix: 1.0,
  "B-2": 1.0,
  "BMX-3": 1.0,
  "BMX-4": 1.0,
};

// commercial coverage fraction of lot_sqft
export const COMMERCIAL_COVERAGE = {
  commercial1: 0.3,
  commercial2: 0.4,
  commercial3: 0.6,
};

// bill 7 grant amounts: post-construction per affordable unit (units under
// 300 sf get $40/sf of floor area), pre-construction per unit
export const GRANT = {
  pre_construct: 50000,
  post_construct: 12000,
  small_unit_sqft: 300,
  small_unit_per_sqft: 40,
};

// prevailing wages (HRS 104), required for the pre-construction subsidy only
export const PREVAILING_WAGE = {
  // on-site labor share of hard cost (2022 economic census, DBEDT data book
  // tables 21.05-21.06: 22-27%)
  onsite_labor_share: 0.25,
  // prevailing wage premium on that labor: median of 11 trades, dlir bulletin
  // 509 (basic + fringe) vs bls oews honolulu median wage plus 30% benefits
  // (27-83% by trade; test 35% and 55%)
  labor_premium: 0.45,
};

// post-construction grant for one affordable unit of the given floor area
export function postGrantPerUnit(unit_sqft: number): number {
  return unit_sqft < GRANT.small_unit_sqft
    ? unit_sqft * GRANT.small_unit_per_sqft
    : GRANT.post_construct;
}

// blended post-construction grant per affordable unit for a mix key, sized
// unit type by unit type
export function mixPostGrant(mix_key: string): number {
  const mix = UNIT_MIX[mix_key] ?? UNIT_MIX["one_bb_100"];
  return mix.reduce(
    (sum, m) => sum + postGrantPerUnit(UNIT_SIZE[m.type] ?? 500) * m.weight,
    0
  );
}

// parking
export const PARKING = {
  // default stalls per dwelling unit
  stalls_per_unit: 0.85,
  // gross sqft per stall incl. drive aisles (Ulupono 2020)
  stall_sqft: 330,
  monthly_rent_per_stall: 100,
  // RLB Q2 2026 Honolulu above-ground parking, low end of $190–245
  cost_per_sqft: 190,
  // surface lot: Ulupono 2020 on-grade construction, adjusted to 2026 + margin
  surface_stall_sqft: 360,
  surface_cost_per_sqft: 30,
};

// ground-floor retail share of the floor plate
export const DEFAULT_RETAIL_SHARE = 0.1;

// § 21-6.20 minimum off-street parking (Table 21-6.1) and § 21-6.30(g) joint
// use (Table 21-6.2), for pathways that must provide parking
export const PARKING_MINIMUM = {
  // 1 stall per 1,000 sqft of private dwelling area, common areas excluded
  residential_sqft_per_stall: 1000,
  // Commercial 1 (retail and sales, eating and drinking, offices): 1 per 500
  retail_sqft_per_stall: 500,
  // housing and retail sharing the stalls and loading
  joint_use: 0.9,
};

// § 21-6.110 off-street loading (Table 21-6.5) and § 21-6.130 space sizes
export const LOADING = {
  // lots of this size or less need no loading space
  min_lot_sqft: 7500,
  // 19 ft x 8 ft 6 in
  small_sqft: 19 * 8.5,
  // 35 ft x 12 ft, for a third of the spaces when more than one is required
  large_sqft: 35 * 12,
};

// § 21-6.20(b)(1), § 21-6.110(b)(3): a fraction of 0.5 or more rounds up
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

/** legal minimum stalls per unit: 1 per 1,000 sqft of private dwelling area;
 *  exempt parcels (§ 21-6.20(a)) pass `parking_exempt` instead */
export function legalParkingRatio(unit_type: string): number {
  return mixUnitSize(unit_type) / PARKING_MINIMUM.residential_sqft_per_stall;
}

/** Table 21-6.5: loading spaces for multifamily (by units) and retail (by
 *  floor area), with the joint-use rate when both need one */
export function loadingSpaces(
  units: number,
  retail_sqft: number,
  joint_use = 1
): number {
  const multifamily =
    units < 20
      ? 0
      : units <= 150
        ? 1
        : units <= 300
          ? 2
          : 2 + roundHalfUp((units - 300) / 200);
  const retail =
    retail_sqft < 2000
      ? 0
      : retail_sqft <= 10000
        ? 1
        : retail_sqft <= 20000
          ? 2
          : retail_sqft <= 40000
            ? 3
            : retail_sqft <= 60000
              ? 4
              : 4 + roundHalfUp((retail_sqft - 60000) / 50000);
  const joint = multifamily > 0 && retail > 0 ? joint_use : 1;
  return roundHalfUp(joint * (multifamily + retail));
}

/** § 21-6.130(a): ground area the loading spaces take, sqft */
export function loadingSqft(spaces: number): number {
  if (spaces <= 0) return 0;
  if (spaces === 1) return LOADING.small_sqft;
  const large = roundHalfUp(spaces / 3);
  return large * LOADING.large_sqft + (spaces - large) * LOADING.small_sqft;
}

/** Article 6 inputs to podiumEnvelope for a pathway that must provide
 *  parking: retail stalls, the joint-use rate and loading. An exempt lot
 *  (§ 21-6.20(a)) needs no stalls but still needs loading (§ 21-6.110). */
export function article6Parking(lot_sqft: number, parking_exempt = false) {
  return {
    retail_stalls_per_sqft: parking_exempt
      ? 0
      : 1 / PARKING_MINIMUM.retail_sqft_per_stall,
    joint_use: PARKING_MINIMUM.joint_use,
    loading: lot_sqft > LOADING.min_lot_sqft,
    bicycle: true,
  };
}

// bicycle parking
// § 21-6.40, Table 21-6.3. Costs are installed costs per space (GoodLockers,
// Nov 2025): a U-rack for short-term, a locker for long-term.
export const BICYCLE_PARKING = {
  short_term: {
    // residential: 1 per 10 units; commercial: 1 per 2,000 sqft or portion,
    // or 1 per 10 vehicle spaces or portion, whichever is greater
    units_per_space: 10,
    retail_sqft_per_space: 2000,
    stalls_per_space: 10,
    cost_per_space: 225,
  },
  long_term: {
    // residential: 1 per 2 units; commercial: 1 per 12,000 sqft, or 1 per 30
    // vehicle spaces or portion, whichever is greater
    units_per_space: 2,
    retail_sqft_per_space: 12000,
    stalls_per_space: 30,
    cost_per_space: 1250,
  },
  // § 21-6.40(d)(1): 2 ft x 6 ft, plus 5 ft clear on the 2 ft access side
  sqft_per_space: 2 * 6 + 2 * 5,
};

/** § 21-6.40(a): the districts that require bicycle parking (apartment,
 *  AMX, business, BMX, resort and Waikiki; not industrial) */
export function bicycleRequired(zone_class: string): boolean {
  return !INDUSTRIAL.includes(zone_class);
}

/** Table 21-6.3: short- and long-term spaces for the housing and the retail,
 *  with a fraction of 0.5 or more rounded up (§ 21-6.40(b)) */
export function bicycleSpaces(
  units: number,
  retail_sqft: number,
  retail_stalls: number
): { short_term: number; long_term: number } {
  const st = BICYCLE_PARKING.short_term;
  const lt = BICYCLE_PARKING.long_term;
  const up = (x: number) => Math.ceil(x - 1e-9);
  const retail = retail_sqft > 0;
  const short_retail = retail
    ? Math.max(
        up(retail_sqft / st.retail_sqft_per_space),
        up(retail_stalls / st.stalls_per_space)
      )
    : 0;
  const long_retail = retail
    ? Math.max(
        retail_sqft / lt.retail_sqft_per_space,
        up(retail_stalls / lt.stalls_per_space)
      )
    : 0;
  return {
    short_term: roundHalfUp(units / st.units_per_space + short_retail),
    long_term: roundHalfUp(units / lt.units_per_space + long_retail),
  };
}

// fee constants
export const FEES = {
  environment: { ea: 600, eis: 1200 },
  administrative: { temp_occupancy_cert: 200 },
  park_dedication: { exempt: 0, in_lieu: 200 },
  // school impact fee (HRS Ch. 302A),this is a state assessment, so this
  // does not trigger the city's waivable impact fees set to 0 for now instead of $1836
  impact: { per_dwelling: 0 },
  civil: { escp: 250, installation_trench: 195, service_connection: 50 },
  zoning: { tod_application: 15000 },
  wastewater_charge_per_esdu: 7539,
};

// =========================================================
// BWS WATER CHARGES (one-time soft costs, paid at building permit)
// =========================================================

// Water System Facilities Charge, $/fixture unit; flat, never escalated.
// Multi-family rates only (single-family is not used).
export const WSFC_PER_FU = {
  // up to 3 living stories
  multi_low_rise: 271.27,
  // higher than 3 living stories
  multi_high_rise: 204.12,
} as const;

// per application
export const WSFC_MIN_FU = 20;
// affordable-unit waiver cap, applied per project (BWS's is 500/yr islandwide)
export const WSFC_WAIVER_UNIT_CAP = 500;

// fixture units per dwelling unit, low-flow; no dishwasher or hose bibb,
// in-unit washer
export const FU_PER_UNIT = {
  bath_1: 7.5,
  bath_1_5: 9.8,
  bath_2: 11.4,
} as const;

// baths assumed for each unit type
export const BATHS_BY_UNIT_TYPE: Record<string, keyof typeof FU_PER_UNIT> = {
  studio: "bath_1",
  one_bb: "bath_1",
  two_bb: "bath_1_5",
  three_bb: "bath_2",
  four_bb: "bath_2",
};

// matches BWS's worked examples
export const COMMON_AREA_FU = 0;

// new meter cost: fire service connection charge by meter size (inches)
export const FIRE_METER_CHARGE: Record<string, number> = {
  "5/8": 500,
  "3/4": 600,
  "1": 700,
  "1.5": 1100,
  "2": 1700,
  "4": 5600,
  "6": 12100,
  "8": 21100,
};

export function wsfcCategory(
  living_stories: number
): "multi_low_rise" | "multi_high_rise" {
  return living_stories <= 3 ? "multi_low_rise" : "multi_high_rise";
}

// blended fixture units per dwelling unit for a mix key
export function mixFixtureUnits(mix_key: string): number {
  const mix = UNIT_MIX[mix_key] ?? UNIT_MIX["one_bb_100"];
  return mix.reduce(
    (sum, m) =>
      sum + FU_PER_UNIT[BATHS_BY_UNIT_TYPE[m.type] ?? "bath_1"] * m.weight,
    0
  );
}

// assumed fire meter size by residential stories
export function fireMeterSize(living_stories: number): string {
  if (living_stories <= 3) return "4";
  if (living_stories <= 6) return "6";
  return "8";
}

// residential stories built: residential floor area over the floor plate
export function livingStories(
  gross_residential_sqft: number,
  coverage_cap: number,
  setback_cap: number,
  floors: number
): number {
  const plate = Math.min(coverage_cap, setback_cap) / Math.max(floors, 1);
  if (plate <= 0 || gross_residential_sqft <= 0) return 0;
  return Math.ceil(gross_residential_sqft / plate - 1e-9);
}

// WSFC and new meter cost on the units the Impact Fees toggle doesn't waive
export function calcWaterFees(i: {
  max_units: number;
  water_chargeable_units: number;
  living_stories: number;
  fu_per_unit: number;
}): { wsfc: number; water_meter: number; total_fu: number } {
  if (i.max_units <= 0) return { wsfc: 0, water_meter: 0, total_fu: 0 };
  const rate = WSFC_PER_FU[wsfcCategory(i.living_stories)];
  const total_fu = Math.max(
    i.max_units * i.fu_per_unit + COMMON_AREA_FU,
    WSFC_MIN_FU
  );
  const waived_units = i.max_units - i.water_chargeable_units;
  // WSFC is waived on the fixture units of the waived units
  const wsfc =
    i.water_chargeable_units > 0
      ? (total_fu - waived_units * i.fu_per_unit) * rate
      : 0;
  // the meter waiver is the waived units' share of all units
  const meter_gross = FIRE_METER_CHARGE[fireMeterSize(i.living_stories)];
  const water_meter = (meter_gross * i.water_chargeable_units) / i.max_units;
  return { wsfc, water_meter, total_fu };
}

// =========================================================
// HHFDC AFFORDABLE SALE PRICE TABLES
// =========================================================
// 2026 HHFDC Honolulu County income schedule by family size (median $133,400)
export const INCOME_LIMITS: Record<number, number[]> = {
  10: [10780, 12320, 13860, 15400, 16640, 17870, 19100, 20330],
  20: [21560, 24640, 27720, 30800, 33280, 35740, 38200, 40660],
  30: [32340, 36960, 41580, 46200, 49920, 53610, 57300, 60990],
  40: [43120, 49280, 55440, 61600, 66560, 71480, 76400, 81320],
  50: [53900, 61600, 69300, 77000, 83200, 89350, 95500, 101650],
  60: [64680, 73920, 83160, 92400, 99840, 107220, 114600, 121980],
  70: [75460, 86240, 97020, 107800, 116480, 125090, 133700, 142310],
  80: [86240, 98560, 110880, 123200, 133120, 142960, 152800, 162640],
  90: [97020, 110880, 124740, 138600, 149760, 160830, 171900, 182970],
  100: [107800, 123200, 138600, 154000, 166400, 178700, 191000, 203300],
  110: [118580, 135520, 152460, 169400, 183040, 196570, 210100, 223630],
  120: [129360, 147840, 166320, 184800, 199680, 214440, 229200, 243960],
  130: [140140, 160160, 180180, 200200, 216320, 232310, 248300, 264290],
  140: [150920, 172480, 194040, 215600, 232960, 250180, 267400, 284620],
};

const HHFDC_RATES = [
  0.04, 0.0425, 0.045, 0.0475, 0.05, 0.0525, 0.055, 0.0575, 0.06, 0.0625, 0.065,
  0.0675, 0.07, 0.0725, 0.075,
];

type HhfdcTable = Record<number, Record<string, number>>;

const HHFDC_0BR: HhfdcTable = {
  0.04: {
    ami_50: 277300,
    ami_60: 332800,
    ami_70: 388200,
    ami_80: 443700,
    ami_90: 499100,
    ami_100: 554600,
    ami_110: 610100,
    ami_120: 665500,
    ami_130: 721000,
    ami_140: 776400,
  },
  0.0425: {
    ami_50: 269100,
    ami_60: 322900,
    ami_70: 376800,
    ami_80: 430600,
    ami_90: 484400,
    ami_100: 538200,
    ami_110: 592000,
    ami_120: 645900,
    ami_130: 699700,
    ami_140: 753500,
  },
  0.045: {
    ami_50: 261300,
    ami_60: 313500,
    ami_70: 365800,
    ami_80: 418000,
    ami_90: 470300,
    ami_100: 522600,
    ami_110: 574800,
    ami_120: 627100,
    ami_130: 679300,
    ami_140: 731600,
  },
  0.0475: {
    ami_50: 253800,
    ami_60: 304500,
    ami_70: 355300,
    ami_80: 406100,
    ami_90: 456800,
    ami_100: 507600,
    ami_110: 558300,
    ami_120: 609100,
    ami_130: 659800,
    ami_140: 710600,
  },
  0.05: {
    ami_50: 246600,
    ami_60: 295900,
    ami_70: 345300,
    ami_80: 394600,
    ami_90: 443900,
    ami_100: 493200,
    ami_110: 542500,
    ami_120: 591900,
    ami_130: 641200,
    ami_140: 690500,
  },
  0.0525: {
    ami_50: 239700,
    ami_60: 287700,
    ami_70: 335600,
    ami_80: 383600,
    ami_90: 431500,
    ami_100: 479500,
    ami_110: 527400,
    ami_120: 575400,
    ami_130: 623300,
    ami_140: 671300,
  },
  0.055: {
    ami_50: 233200,
    ami_60: 279800,
    ami_70: 326400,
    ami_80: 373100,
    ami_90: 419700,
    ami_100: 466300,
    ami_110: 513000,
    ami_120: 559600,
    ami_130: 606200,
    ami_140: 652800,
  },
  0.0575: {
    ami_50: 226900,
    ami_60: 272200,
    ami_70: 317600,
    ami_80: 363000,
    ami_90: 408300,
    ami_100: 453700,
    ami_110: 499100,
    ami_120: 544500,
    ami_130: 589800,
    ami_140: 635200,
  },
  0.06: {
    ami_50: 220800,
    ami_60: 265000,
    ami_70: 309100,
    ami_80: 353300,
    ami_90: 397500,
    ami_100: 441600,
    ami_110: 485800,
    ami_120: 529900,
    ami_130: 574100,
    ami_140: 618300,
  },
  0.0625: {
    ami_50: 215000,
    ami_60: 258000,
    ami_70: 301000,
    ami_80: 344000,
    ami_90: 387000,
    ami_100: 430000,
    ami_110: 473000,
    ami_120: 516000,
    ami_130: 559000,
    ami_140: 602000,
  },
  0.065: {
    ami_50: 209400,
    ami_60: 251300,
    ami_70: 293200,
    ami_80: 335100,
    ami_90: 377000,
    ami_100: 418900,
    ami_110: 460800,
    ami_120: 502700,
    ami_130: 544600,
    ami_140: 586500,
  },
  0.0675: {
    ami_50: 204100,
    ami_60: 244900,
    ami_70: 285800,
    ami_80: 326600,
    ami_90: 367400,
    ami_100: 408200,
    ami_110: 449000,
    ami_120: 489900,
    ami_130: 530700,
    ami_140: 571500,
  },
  0.07: {
    ami_50: 199000,
    ami_60: 238800,
    ami_70: 278600,
    ami_80: 318400,
    ami_90: 358200,
    ami_100: 398000,
    ami_110: 437800,
    ami_120: 477600,
    ami_130: 517400,
    ami_140: 557200,
  },
  0.0725: {
    ami_50: 194100,
    ami_60: 232900,
    ami_70: 271700,
    ami_80: 310500,
    ami_90: 349300,
    ami_100: 388100,
    ami_110: 426900,
    ami_120: 465800,
    ami_130: 504600,
    ami_140: 543400,
  },
  0.075: {
    ami_50: 189300,
    ami_60: 227200,
    ami_70: 265100,
    ami_80: 302900,
    ami_90: 340800,
    ami_100: 378700,
    ami_110: 416500,
    ami_120: 454400,
    ami_130: 492300,
    ami_140: 530100,
  },
};

const HHFDC_1BR: HhfdcTable = {
  0.04: {
    ami_50: 316900,
    ami_60: 380300,
    ami_70: 443700,
    ami_80: 507100,
    ami_90: 570400,
    ami_100: 633800,
    ami_110: 697200,
    ami_120: 760600,
    ami_130: 824000,
    ami_140: 887400,
  },
  0.0425: {
    ami_50: 307600,
    ami_60: 369100,
    ami_70: 430600,
    ami_80: 492100,
    ami_90: 553600,
    ami_100: 615100,
    ami_110: 676600,
    ami_120: 738100,
    ami_130: 799600,
    ami_140: 861200,
  },
  0.045: {
    ami_50: 298600,
    ami_60: 358300,
    ami_70: 418000,
    ami_80: 477800,
    ami_90: 537500,
    ami_100: 597200,
    ami_110: 656900,
    ami_120: 716600,
    ami_130: 776400,
    ami_140: 836100,
  },
  0.0475: {
    ami_50: 290000,
    ami_60: 348000,
    ami_70: 406100,
    ami_80: 464100,
    ami_90: 522100,
    ami_100: 580100,
    ami_110: 638100,
    ami_120: 696100,
    ami_130: 754100,
    ami_140: 812100,
  },
  0.05: {
    ami_50: 281800,
    ami_60: 338200,
    ami_70: 394600,
    ami_80: 450900,
    ami_90: 507300,
    ami_100: 563700,
    ami_110: 620000,
    ami_120: 676400,
    ami_130: 732800,
    ami_140: 789200,
  },
  0.0525: {
    ami_50: 274000,
    ami_60: 328800,
    ami_70: 383600,
    ami_80: 438400,
    ami_90: 493200,
    ami_100: 548000,
    ami_110: 602800,
    ami_120: 657600,
    ami_130: 712400,
    ami_140: 767200,
  },
  0.055: {
    ami_50: 266500,
    ami_60: 319800,
    ami_70: 373100,
    ami_80: 426400,
    ami_90: 479600,
    ami_100: 532900,
    ami_110: 586200,
    ami_120: 639500,
    ami_130: 692800,
    ami_140: 746100,
  },
  0.0575: {
    ami_50: 259300,
    ami_60: 311100,
    ami_70: 363000,
    ami_80: 414800,
    ami_90: 466700,
    ami_100: 518500,
    ami_110: 570400,
    ami_120: 622200,
    ami_130: 674100,
    ami_140: 725900,
  },
  0.06: {
    ami_50: 252400,
    ami_60: 302800,
    ami_70: 353300,
    ami_80: 403800,
    ami_90: 454200,
    ami_100: 504700,
    ami_110: 555200,
    ami_120: 605600,
    ami_130: 656100,
    ami_140: 706600,
  },
  0.0625: {
    ami_50: 245700,
    ami_60: 294900,
    ami_70: 344000,
    ami_80: 393200,
    ami_90: 442300,
    ami_100: 491500,
    ami_110: 540600,
    ami_120: 589700,
    ami_130: 638900,
    ami_140: 688000,
  },
  0.065: {
    ami_50: 239400,
    ami_60: 287200,
    ami_70: 335100,
    ami_80: 383000,
    ami_90: 430900,
    ami_100: 478700,
    ami_110: 526600,
    ami_120: 574500,
    ami_130: 622400,
    ami_140: 670200,
  },
  0.0675: {
    ami_50: 233300,
    ami_60: 279900,
    ami_70: 326600,
    ami_80: 373200,
    ami_90: 419900,
    ami_100: 466500,
    ami_110: 513200,
    ami_120: 559800,
    ami_130: 606500,
    ami_140: 653200,
  },
  0.07: {
    ami_50: 227400,
    ami_60: 272900,
    ami_70: 318400,
    ami_80: 363900,
    ami_90: 409300,
    ami_100: 454800,
    ami_110: 500300,
    ami_120: 545800,
    ami_130: 591300,
    ami_140: 636800,
  },
  0.0725: {
    ami_50: 221800,
    ami_60: 266100,
    ami_70: 310500,
    ami_80: 354900,
    ami_90: 399200,
    ami_100: 443600,
    ami_110: 487900,
    ami_120: 532300,
    ami_130: 576600,
    ami_140: 621000,
  },
  0.075: {
    ami_50: 216400,
    ami_60: 259700,
    ami_70: 302900,
    ami_80: 346200,
    ami_90: 389500,
    ami_100: 432800,
    ami_110: 476000,
    ami_120: 519300,
    ami_130: 562600,
    ami_140: 605900,
  },
};

const HHFDC_2BR: HhfdcTable = {
  0.04: {
    ami_50: 356500,
    ami_60: 427800,
    ami_70: 499100,
    ami_80: 570400,
    ami_90: 641700,
    ami_100: 713100,
    ami_110: 784400,
    ami_120: 855700,
    ami_130: 927000,
    ami_140: 998300,
  },
  0.0425: {
    ami_50: 346000,
    ami_60: 415200,
    ami_70: 484400,
    ami_80: 553600,
    ami_90: 622800,
    ami_100: 692000,
    ami_110: 761200,
    ami_120: 830400,
    ami_130: 899600,
    ami_140: 968800,
  },
  0.045: {
    ami_50: 335900,
    ami_60: 403100,
    ami_70: 470300,
    ami_80: 537500,
    ami_90: 604700,
    ami_100: 671900,
    ami_110: 739000,
    ami_120: 806200,
    ami_130: 873400,
    ami_140: 940600,
  },
  0.0475: {
    ami_50: 326300,
    ami_60: 391600,
    ami_70: 456800,
    ami_80: 522100,
    ami_90: 587300,
    ami_100: 652600,
    ami_110: 717800,
    ami_120: 783100,
    ami_130: 848400,
    ami_140: 913600,
  },
  0.05: {
    ami_50: 317100,
    ami_60: 380500,
    ami_70: 443900,
    ami_80: 507300,
    ami_90: 570700,
    ami_100: 634100,
    ami_110: 697600,
    ami_120: 761000,
    ami_130: 824400,
    ami_140: 887800,
  },
  0.0525: {
    ami_50: 308200,
    ami_60: 369900,
    ami_70: 431500,
    ami_80: 493200,
    ami_90: 554800,
    ami_100: 616500,
    ami_110: 678100,
    ami_120: 739800,
    ami_130: 801400,
    ami_140: 863100,
  },
  0.055: {
    ami_50: 299800,
    ami_60: 359700,
    ami_70: 419700,
    ami_80: 479600,
    ami_90: 539600,
    ami_100: 599600,
    ami_110: 659500,
    ami_120: 719500,
    ami_130: 779400,
    ami_140: 839400,
  },
  0.0575: {
    ami_50: 291700,
    ami_60: 350000,
    ami_70: 408300,
    ami_80: 466700,
    ami_90: 525000,
    ami_100: 583300,
    ami_110: 641700,
    ami_120: 700000,
    ami_130: 758300,
    ami_140: 816700,
  },
  0.06: {
    ami_50: 283900,
    ami_60: 340700,
    ami_70: 397500,
    ami_80: 454200,
    ami_90: 511000,
    ami_100: 567800,
    ami_110: 624600,
    ami_120: 681400,
    ami_130: 738100,
    ami_140: 794900,
  },
  0.0625: {
    ami_50: 276400,
    ami_60: 331700,
    ami_70: 387000,
    ami_80: 442300,
    ami_90: 497600,
    ami_100: 552900,
    ami_110: 608200,
    ami_120: 663500,
    ami_130: 718800,
    ami_140: 774000,
  },
  0.065: {
    ami_50: 269300,
    ami_60: 323100,
    ami_70: 377000,
    ami_80: 430900,
    ami_90: 484700,
    ami_100: 538600,
    ami_110: 592400,
    ami_120: 646300,
    ami_130: 700200,
    ami_140: 754000,
  },
  0.0675: {
    ami_50: 262400,
    ami_60: 314900,
    ami_70: 367400,
    ami_80: 419900,
    ami_90: 472400,
    ami_100: 524900,
    ami_110: 577300,
    ami_120: 629800,
    ami_130: 682300,
    ami_140: 734800,
  },
  0.07: {
    ami_50: 255800,
    ami_60: 307000,
    ami_70: 358200,
    ami_80: 409300,
    ami_90: 460500,
    ami_100: 511700,
    ami_110: 562800,
    ami_120: 614000,
    ami_130: 665200,
    ami_140: 716400,
  },
  0.0725: {
    ami_50: 249500,
    ami_60: 299400,
    ami_70: 349300,
    ami_80: 399200,
    ami_90: 449100,
    ami_100: 499000,
    ami_110: 548900,
    ami_120: 598800,
    ami_130: 648700,
    ami_140: 698600,
  },
  0.075: {
    ami_50: 243400,
    ami_60: 292100,
    ami_70: 340800,
    ami_80: 389500,
    ami_90: 438200,
    ami_100: 486900,
    ami_110: 535500,
    ami_120: 584200,
    ami_130: 632900,
    ami_140: 681600,
  },
};

const HHFDC_3BR: HhfdcTable = {
  0.04: {
    ami_50: 396100,
    ami_60: 475400,
    ami_70: 554600,
    ami_80: 633800,
    ami_90: 713100,
    ami_100: 792300,
    ami_110: 871500,
    ami_120: 950700,
    ami_130: 1030000,
    ami_140: 1109200,
  },
  0.0425: {
    ami_50: 384400,
    ami_60: 461300,
    ami_70: 538200,
    ami_80: 615100,
    ami_90: 692000,
    ami_100: 768900,
    ami_110: 845800,
    ami_120: 922700,
    ami_130: 999600,
    ami_140: 1076400,
  },
  0.045: {
    ami_50: 373300,
    ami_60: 447900,
    ami_70: 522600,
    ami_80: 597200,
    ami_90: 671900,
    ami_100: 746500,
    ami_110: 821200,
    ami_120: 895800,
    ami_130: 970500,
    ami_140: 1045100,
  },
  0.0475: {
    ami_50: 362500,
    ami_60: 435100,
    ami_70: 507600,
    ami_80: 580100,
    ami_90: 652600,
    ami_100: 725100,
    ami_110: 797600,
    ami_120: 870100,
    ami_130: 942600,
    ami_140: 1015100,
  },
  0.05: {
    ami_50: 352300,
    ami_60: 422800,
    ami_70: 493200,
    ami_80: 563700,
    ami_90: 634100,
    ami_100: 704600,
    ami_110: 775100,
    ami_120: 845500,
    ami_130: 916000,
    ami_140: 986400,
  },
  0.0525: {
    ami_50: 342500,
    ami_60: 411000,
    ami_70: 479500,
    ami_80: 548000,
    ami_90: 616500,
    ami_100: 685000,
    ami_110: 753500,
    ami_120: 822000,
    ami_130: 890500,
    ami_140: 959000,
  },
  0.055: {
    ami_50: 333100,
    ami_60: 399700,
    ami_70: 466300,
    ami_80: 532900,
    ami_90: 599600,
    ami_100: 666200,
    ami_110: 732800,
    ami_120: 799400,
    ami_130: 866000,
    ami_140: 932600,
  },
  0.0575: {
    ami_50: 324100,
    ami_60: 388900,
    ami_70: 453700,
    ami_80: 518500,
    ami_90: 583300,
    ami_100: 648200,
    ami_110: 713000,
    ami_120: 777800,
    ami_130: 842600,
    ami_140: 907400,
  },
  0.06: {
    ami_50: 315400,
    ami_60: 378500,
    ami_70: 441600,
    ami_80: 504700,
    ami_90: 567800,
    ami_100: 630900,
    ami_110: 694000,
    ami_120: 757100,
    ami_130: 820100,
    ami_140: 883200,
  },
  0.0625: {
    ami_50: 307200,
    ami_60: 368600,
    ami_70: 430000,
    ami_80: 491500,
    ami_90: 552900,
    ami_100: 614300,
    ami_110: 675700,
    ami_120: 737200,
    ami_130: 798600,
    ami_140: 860000,
  },
  0.065: {
    ami_50: 299200,
    ami_60: 359100,
    ami_70: 418900,
    ami_80: 478700,
    ami_90: 538600,
    ami_100: 598400,
    ami_110: 658300,
    ami_120: 718100,
    ami_130: 778000,
    ami_140: 837800,
  },
  0.0675: {
    ami_50: 291600,
    ami_60: 349900,
    ami_70: 408200,
    ami_80: 466500,
    ami_90: 524900,
    ami_100: 583200,
    ami_110: 641500,
    ami_120: 699800,
    ami_130: 758100,
    ami_140: 816400,
  },
  0.07: {
    ami_50: 284300,
    ami_60: 341100,
    ami_70: 398000,
    ami_80: 454800,
    ami_90: 511700,
    ami_100: 568500,
    ami_110: 625400,
    ami_120: 682200,
    ami_130: 739100,
    ami_140: 795900,
  },
  0.0725: {
    ami_50: 277200,
    ami_60: 332700,
    ami_70: 388100,
    ami_80: 443600,
    ami_90: 499000,
    ami_100: 554500,
    ami_110: 609900,
    ami_120: 665400,
    ami_130: 720800,
    ami_140: 776300,
  },
  0.075: {
    ami_50: 270500,
    ami_60: 324600,
    ami_70: 378700,
    ami_80: 432800,
    ami_90: 486900,
    ami_100: 541000,
    ami_110: 595100,
    ami_120: 649100,
    ami_130: 703200,
    ami_140: 757300,
  },
};

const HHFDC_4BR: HhfdcTable = {
  0.04: {
    ami_50: 428000,
    ami_60: 513600,
    ami_70: 599300,
    ami_80: 684900,
    ami_90: 770500,
    ami_100: 856100,
    ami_110: 941700,
    ami_120: 1027300,
    ami_130: 1112900,
    ami_140: 1198500,
  },
  0.0425: {
    ami_50: 415400,
    ami_60: 498500,
    ami_70: 581600,
    ami_80: 664600,
    ami_90: 747700,
    ami_100: 830800,
    ami_110: 913900,
    ami_120: 997000,
    ami_130: 1080000,
    ami_140: 1163100,
  },
  0.045: {
    ami_50: 403300,
    ami_60: 484000,
    ami_70: 564600,
    ami_80: 645300,
    ami_90: 726000,
    ami_100: 806600,
    ami_110: 887300,
    ami_120: 967900,
    ami_130: 1048600,
    ami_140: 1129300,
  },
  0.0475: {
    ami_50: 391700,
    ami_60: 470100,
    ami_70: 548400,
    ami_80: 626800,
    ami_90: 705100,
    ami_100: 783500,
    ami_110: 861800,
    ami_120: 940200,
    ami_130: 1018500,
    ami_140: 1096900,
  },
  0.05: {
    ami_50: 380700,
    ami_60: 456800,
    ami_70: 532900,
    ami_80: 609100,
    ami_90: 685200,
    ami_100: 761300,
    ami_110: 837500,
    ami_120: 913600,
    ami_130: 989700,
    ami_140: 1065900,
  },
  0.0525: {
    ami_50: 370100,
    ami_60: 444100,
    ami_70: 518100,
    ami_80: 592100,
    ami_90: 666100,
    ami_100: 740100,
    ami_110: 814100,
    ami_120: 888200,
    ami_130: 962200,
    ami_140: 1036200,
  },
  0.055: {
    ami_50: 359900,
    ami_60: 431900,
    ami_70: 503900,
    ami_80: 575900,
    ami_90: 647800,
    ami_100: 719800,
    ami_110: 791800,
    ami_120: 863800,
    ami_130: 935800,
    ami_140: 1007700,
  },
  0.0575: {
    ami_50: 350200,
    ami_60: 420200,
    ami_70: 490200,
    ami_80: 560300,
    ami_90: 630300,
    ami_100: 700300,
    ami_110: 770400,
    ami_120: 840400,
    ami_130: 910400,
    ami_140: 980500,
  },
  0.06: {
    ami_50: 340800,
    ami_60: 409000,
    ami_70: 477200,
    ami_80: 545300,
    ami_90: 613500,
    ami_100: 681700,
    ami_110: 749800,
    ami_120: 818000,
    ami_130: 886200,
    ami_140: 954400,
  },
  0.0625: {
    ami_50: 331900,
    ami_60: 398300,
    ami_70: 464600,
    ami_80: 531000,
    ami_90: 597400,
    ami_100: 663800,
    ami_110: 730200,
    ami_120: 796500,
    ami_130: 862900,
    ami_140: 929300,
  },
  0.065: {
    ami_50: 323300,
    ami_60: 388000,
    ami_70: 452600,
    ami_80: 517300,
    ami_90: 581900,
    ami_100: 646600,
    ami_110: 711300,
    ami_120: 775900,
    ami_130: 840600,
    ami_140: 905300,
  },
  0.0675: {
    ami_50: 315100,
    ami_60: 378100,
    ami_70: 441100,
    ami_80: 504100,
    ami_90: 567100,
    ami_100: 630100,
    ami_110: 693100,
    ami_120: 756200,
    ami_130: 819200,
    ami_140: 882200,
  },
  0.07: {
    ami_50: 307200,
    ami_60: 368600,
    ami_70: 430000,
    ami_80: 491400,
    ami_90: 552900,
    ami_100: 614300,
    ami_110: 675700,
    ami_120: 737200,
    ami_130: 798600,
    ami_140: 860000,
  },
  0.0725: {
    ami_50: 299600,
    ami_60: 359500,
    ami_70: 419400,
    ami_80: 479300,
    ami_90: 539200,
    ami_100: 599100,
    ami_110: 659000,
    ami_120: 718900,
    ami_130: 778800,
    ami_140: 838800,
  },
  0.075: {
    ami_50: 292300,
    ami_60: 350700,
    ami_70: 409200,
    ami_80: 467600,
    ami_90: 526100,
    ami_100: 584500,
    ami_110: 643000,
    ami_120: 701400,
    ami_130: 759900,
    ami_140: 818300,
  },
};

const HHFDC_TABLES: Record<string, HhfdcTable> = {
  studio: HHFDC_0BR,
  one_bb: HHFDC_1BR,
  two_bb: HHFDC_2BR,
  three_bb: HHFDC_3BR,
  four_bb: HHFDC_4BR,
};

// =========================================================
// TYPES
// =========================================================

export type ProgramId = "bill7" | "standard" | "tod" | "h201" | "bill6";

export interface SliderInputs {
  program: ProgramId;
  lot_sqft?: number;
  height_limit?: number;
  floor_height?: number;
  zone_class?: string;
  rental_split?: number;
  sale_split?: number;
  market_price?: number;
  target_return?: number;
  profit_margin?: number;
  affordable_ami?: string;
  /** § 21-3.120-2(b) open-space FAR bonus on offer, in FAR, included in
   *  max_far. It costs lot_sqft/5 of ground per 1.0 FAR, so it is both an
   *  uplift and a land cost; calcSingle takes it only if it raises the
   *  residual land value. */
  open_space_bonus?: number;
  /** FAR without the open-space bonus, for that comparison. Defaults to
   *  max_far - open_space_bonus. */
  far_without_bonus?: number;
  market_ami?: string;
  construction_rate?: number;
  equity?: number;
  grant_type?: "none" | "pre_construct" | "post_construct";
  grant_amount?: number;
  // units the pre-construction subsidy pays on (ROH 32-5.2(c)(2): "each unit")
  grant_units?: "all" | "affordable";
  // pre-construction only: premium on on-site labor
  prevailing_wage_premium?: number;
  // on-site labor share of hard cost
  onsite_labor_share?: number;
  land_cost?: number;
  permanent_rate?: number;
  hold_years?: number;
  amort_years?: number;
  leaseup_months?: number;
  min_dscr?: number;
  include_retail?: boolean;
  retail_rent?: number;
  // ground-floor retail as a share of the floor plate
  retail_share?: number;
  // parking stalls per dwelling unit
  parking_ratio?: number;
  // § 21-6.20(a): no off-street parking required (Primary Urban Center and
  // Ewa plan areas, within 0.5 miles of rail, TOD special districts)
  parking_exempt?: boolean;
  // § 21-9.100-8(c)(1): no ground-floor parking within this many feet of
  // the front lot line (TOD special districts)
  front_no_parking_ft?: number;
  // a legal cap on dwelling units (TOD: IMX-1 under PD-T)
  max_units?: number;
  // height step-back; off unless stepback_trigger_ft is set
  stepback_trigger_ft?: number;
  stepback_above_ft?: number;
  stepback_ft_per_10ft?: number;
  mortgage?: number;
  park?: "exempt" | "in_lieu";
  permitting_months?: number;
  const_months?: number;
  unit_type?: string;
  impact_fee?: number;
  affordability?: number;
  cap_rate?: number;
  target_spread?: number;
  setback?: number;
  // building-lot coverage cap
  coverage?: number;
  opex_ratio?: number;
  hard_cost_per_sqft?: number;
  building_area_per_unit?: number;
  max_far?: number;
  waivable_fee_basis?: FeeBasis;
}

export interface ParcelOutput {
  tmk: string;
  zone_class: string;
  lot_sqft: number;
  // effective height limit the envelope was built to
  height_limit: number;
  // open-space FAR bonus taken; 0 when the project does better without it
  open_space_bonus?: number;
  buildable_sqft: number;
  net_residential_sqft: number;
  net_commercial_sqft: number;
  max_units: number;
  parking_stalls: number;
  // § 21-6.110 loading spaces, in the parking area
  loading_spaces?: number;
  // § 21-6.40 bicycle parking spaces, short- and long-term
  bicycle_spaces?: number;
  bicycle_short_term?: number;
  bicycle_long_term?: number;
  // where the stalls go: a surface lot, the ground floor, or podium floors
  surface_stalls?: number;
  ground_floor_stalls?: number;
  podium_stalls?: number;
  // parking levels above the ground floor
  podium_levels: number;
  // storeys actually built, parking included, and their height in ft; can be
  // under height_limit when FAR or the unit count stops the building first
  built_floors: number;
  built_height: number;
  parking_sqft: number;
  // share of the building's gross area used for parking
  parking_share: number;
  affordable_units: number;
  afd_rent_units: number;
  mkt_rent_units: number;
  afd_sale_units: number;
  mkt_sale_units: number;
  hard_cost: number;
  soft_cost: number;
  // soft_cost by line item (fees, permits, water charges, construction
  // management); absent when nothing is built
  soft_cost_breakdown?: SoftCostBreakdown;
  dev_cost: number;
  total_financing_cost: number;
  // financing cost of the construction-only loan that RLV is computed on;
  // total_financing_cost above is the deal loan, sized with land in the base
  rlv_financing_cost: number;
  pre_construction_subsidy: number;
  // bill 7 pre-construction: wage premium in hard_cost, and the subsidy cap
  pw_premium_cost?: number;
  subsidy_labor_cap?: number;
  subsidy_cap_binds?: boolean;
  equity_amount: number;
  loan_balance_at_stab: number;
  permitting_months: number;
  const_months: number;
  leaseup_months: number;
  sales_months: number;
  total_carry_months: number;
  total_months: number;
  project_years: number;
  pri: number;
  pgi: number;
  residential_egi: number;
  retail_pgi: number;
  retail_egi: number;
  egi: number;
  gross_sales: number;
  afd_sales: number;
  mkt_sales: number;
  residential_opex: number;
  retail_opex: number;
  operating_expenses: number;
  property_tax: number;
  noi: number;
  cap_rate: number;
  gdv: number;
  dev_strategy: "dev_flip" | "hold";
  dev_hold_years: number;
  dev_post_grant: number;
  dev_land_cost: number;
  dev_total_dev_cost: number;
  // capital subsidy netted out of the ROC basis (grants that fund the build)
  dev_capital_subsidy: number;
  dev_net_dev_cost: number;
  dev_levered_irr: number;
  dev_equity_multiple: number;
  dev_profit: number;
  dev_roc: number;
  dev_equity_invested: number;
  dev_equity_out: number;
  dev_gdv: number;
  dev_selling_costs: number;
  dev_loan_payoff: number;
  dev_perm_principal: number | null;
  dev_perm_rate: number | null;
  dev_annual_debt_svc: number | null;
  dev_dscr: number | null;
  // equity share of the amount financed after the construction loan is sized
  // to the DSCR (the slider is a floor)
  dev_equity_pct_realized: number;
  dev_dscr_binds: boolean;
  dev_is_bankable: boolean | null;
  dev_cash_on_cash: number | null;
  dev_entry_cap: number | null;
  dev_exit_cap: number | null;
  dev_yr1_prop_tax: number | null;
  dev_investment_spread: number;
  dev_target_roc: number;
  dev_is_feasible: boolean;
  total_predev_cost: number;
  construction_equity: number;
  rlv_selling_costs: number;
  // grants discounted to the land purchase at the target return
  rlv_grants_pv: number;
  // (1 + target return) ^ years to stabilization
  rlv_land_carry: number;
  rlv_profit: number;
  rlv_project_cost: number;
  rlv: number;
  rlv_sqft: number;
  dev_roi: number;
}

// soft cost waiver types
export type FeeBasis = "all_units" | "market_units" | "none";

// soft cost inputs (shared across all pathways)
export type SoftCostInputs = {
  hard_cost: number;
  lot_sqft: number;
  max_units: number;
  affordable_units: number;
  excavation_depth: number;
  park: "exempt" | "in_lieu" | "none";
  park_area: number;
  land_cost_per_sqft: number;
  waivable_fee_basis: FeeBasis;
  // school impact fees don't include in waivable_fee_basis as it's a state fee not city
  impact_fee_per_unit: number;
  zoning_application_fee?: number;
  special_district_fee?: number;
  // BWS water charges
  living_stories: number;
  fu_per_unit: number;
};

// soft cost line items (shared across all pathways)
export type SoftCostBreakdown = {
  environmental: number;
  building_permit: number;
  plan_review: number;
  wastewater: number;
  wsfc: number;
  water_meter: number;
  temp_occupancy: number;
  park_dedication: number;
  escp: number;
  utilities: number;
  grubbing: number;
  stockpiling: number;
  grading: number;
  impact: number;
  construction_mgmt: number;
  zoning_application: number;
  special_district: number;
  total: number;
};

// =========================================================
// HELPER FUNCTIONS
// =========================================================

// zone-based FAR formula
export function calcFAR(zone_class: string, lot_sqft: number): number {
  if (ZONE_GROUPS.lowDensity.includes(zone_class)) {
    if (lot_sqft < 10000) return 0.00003 * lot_sqft + 0.3;
    if (lot_sqft <= 40000) return 0.00001 * lot_sqft + 0.5;
    return 0.9;
  }
  if (zone_class === "A-2" || zone_class === "AMX-2") {
    if (lot_sqft < 10000) return 0.00009 * lot_sqft + 0.4;
    if (lot_sqft <= 40000) return 0.00002 * lot_sqft + 1.1;
    return 1.9;
  }
  if (zone_class === "A-3" || zone_class === "AMX-3") {
    if (lot_sqft < 10000) return 0.00014 * lot_sqft + 0.6;
    if (lot_sqft <= 20000) return 0.00004 * lot_sqft + 1.6;
    if (lot_sqft <= 40000) return 0.00002 * lot_sqft + 2.0;
    return 2.8;
  }
  if (ZONE_GROUPS.waikiki.includes(zone_class)) {
    if (lot_sqft < 20000) return 0.00003 * lot_sqft + 1.3;
    return 1.9;
  }
  if (zone_class === "B-1") return 1.0;
  // Resort, Table 21-3.4
  if (zone_class === "Resort" || zone_class === "ResMix" || zone_class === "ResCom") {
    if (lot_sqft < 10000) return 0.00006 * lot_sqft + 0.4;
    if (lot_sqft <= 30000) return 0.00002 * lot_sqft + 0.8;
    return 1.4;
  }
  // Industrial, Table 21-3.5
  if (zone_class === "I-1") return 1.0;
  if (zone_class === "I-2" || zone_class === "I-3") return 2.5;
  // IMX-1 § 21-3.140-1(c)(1) scales with the use mix; a residential model
  // takes the base rung.
  if (zone_class === "IMX-1") return 1.5;
  // Table 21-3.4; the open-space bonus (§ 21-3.120-2(c)) is added by each
  // pathway that allows it (openSpaceBonusOver)
  if (zone_class === "B-2" || zone_class === "BMX-3") return 2.5;
  if (zone_class === "BMX-4") return 4.0;
  return 0;
}

// ── Transit permits — see the model documentation ────────────────────────

// § 21-9.100-5(b)(5)
export const TOD_ELIGIBLE_DISTRICTS = [
  "A-1", "A-2", "A-3",
  "AMX-1", "AMX-2", "AMX-3",
  "B-1", "B-2",
  "BMX-3", "BMX-4",
  "Resort", "ResCom", "ResMix",
  "I-1", "I-2", "I-3",
  "IMX-1",
];

// § 21-9.100-5(b)(3), single-lot floor
export const TOD_MIN_LOT_SQFT = 20000;

// § 21-9.100-5(e)
export const TOD_MAX_FAR = 7.5;
export const TOD_MAX_HEIGHT_FT = 450;

/** whether the IPD-T bonuses are available at all */
export function todEligible(zone_class: string, lot_sqft: number): boolean {
  return (
    TOD_ELIGIBLE_DISTRICTS.includes(zone_class) && lot_sqft >= TOD_MIN_LOT_SQFT
  );
}

// § 21-9.100-5(d)(1). Use-driven only; the envelope keeps the real district.
export function todUseZone(zone_class: string): string {
  return zone_class === "BMX-4" ? "BMX-4" : "BMX-3";
}

// § 21-9.100-5(e)(1). DOUBLE_AFTER_BONUS orders it 2 x (base + bonus).
// § 21-9.100-5(e)(1)(C): FAR doubles after the open-space bonus in these only
const DOUBLE_AFTER_BONUS = ["B-2", "BMX-3", "BMX-4", "IMX-1"];

// § 21-3.120-2(c) ceilings; the bonus is the gap from base FAR
export const OPEN_SPACE_FAR_CEILING: Record<string, number> = {
  "B-2": 3.5,
  "BMX-3": 3.5,
  "BMX-4": 7.5,
};

// Table 21-3.3 districts; calcFAR still holds older lot-scaled formulas other
// pathways depend on, so calcFarBill6 supplies the current flat figures.
const TABLE_21_3_3 = ["A-1", "AMX-1", "A-2", "AMX-2", "A-3", "AMX-3"];

/**
 * Base FAR by district family: Table 21-3.3 for the apartment districts,
 * calcFAR (Table 21-3.4 and the others) for the rest.
 */
export function baseFar(zone_class: string, lot_sqft = 0): number {
  if (TABLE_21_3_3.includes(zone_class)) return calcFarBill6(zone_class);
  return calcFAR(zone_class, lot_sqft);
}

/** largest open-space bonus the district allows, in FAR */
export function openSpaceBonus(zone_class: string): number {
  return openSpaceBonusOver(zone_class, baseFar(zone_class));
}

/** open-space bonus on top of a pathway's own FAR, up to the district ceiling */
export function openSpaceBonusOver(zone_class: string, far: number): number {
  const ceiling = OPEN_SPACE_FAR_CEILING[zone_class];
  return ceiling == null ? 0 : Math.max(0, ceiling - far);
}

/** lot left for the building once the bonus's public open space (5:1) is set aside */
export function lotAfterOpenSpace(lot_sqft: number, bonus = 0): number {
  return lot_sqft - Math.min(lot_sqft, (bonus * lot_sqft) / 5);
}

export function calcFarTod(
  zone_class: string,
  lot_sqft: number,
  // defaults to the district ceiling; 0 = no public open space provided
  density_bonus?: number,
  plan_far?: number
): number {
  if (!todEligible(zone_class, lot_sqft)) {
    return baseFar(zone_class, lot_sqft);
  }
  const base = baseFar(zone_class, lot_sqft);
  const bonus = density_bonus ?? openSpaceBonus(zone_class);
  const doubled = DOUBLE_AFTER_BONUS.includes(zone_class)
    ? 2 * (base + bonus)
    : 2 * base + bonus;
  const capped = Math.min(doubled, TOD_MAX_FAR);
  return plan_far != null && plan_far > capped ? plan_far : capped;
}

// § 21-9.100-8(a)(1)(A). B-1, BMX-4 and resort are absent from the ladder.
export type TodPermitRoute = "base" | "minor_sd" | "major_sd" | "pdt";

const PDT_SCALED = ["A-1", "A-2", "A-3", "AMX-1", "AMX-2", "AMX-3", "I-1", "I-2", "I-3", "IMX-1"];

export function calcFarPdt(
  zone_class: string,
  lot_sqft: number,
  route: TodPermitRoute = "pdt"
): number {
  const base = baseFar(zone_class, lot_sqft);
  if (route === "base") return base;
  if (zone_class === "BMX-3" || zone_class === "B-2") {
    return route === "pdt" ? 7.0 : 3.5;
  }
  if (PDT_SCALED.includes(zone_class)) {
    return route === "pdt" ? 2.0 * base : 1.2 * base;
  }
  // B-1, BMX-4, resort: no uplift path
  return base;
}

// § 21-9.100-8(a)(1)(D): every route goes up to the map's parenthetical bonus
// height where one is shown; PD-T approval reaches the parenthetical, or the
// major permit height where the map shows none.
export function todHeightPdt(
  base_height: number,
  route: TodPermitRoute = "pdt",
  map_bonus_height?: number
): number {
  const major = Math.min(base_height + 120, 3 * base_height);
  const capped = (height: number) =>
    Math.max(
      base_height,
      map_bonus_height != null ? Math.min(height, map_bonus_height) : height
    );
  switch (route) {
    case "base":
      return base_height;
    case "minor_sd":
      return capped(Math.min(base_height + 60, 2 * base_height));
    case "major_sd":
      return capped(major);
    case "pdt":
      return Math.max(base_height, map_bonus_height ?? major);
  }
}

// Table 21-5.1 bars multi-unit dwelling in industrial districts; IPD-T lifts
// that via the BMX-3 use import (§ 21-9.100-5(d)(1)). Under PD-T only IMX-1
// may have dwellings: up to 10 per zoning lot above the ground floor, with a
// special district permit (§ 21-9.100-7(c)).
const INDUSTRIAL = ["I-1", "I-2", "I-3", "IMX-1"];
export const IMX1_PDT_MAX_UNITS = 10;

export type ResidentialUse = "permitted" | "discretionary" | "not_permitted";

export function residentialUse(
  zone_class: string,
  regime: "pdt" | "ipdt"
): ResidentialUse {
  if (!INDUSTRIAL.includes(zone_class)) return "permitted";
  if (regime === "ipdt") return "permitted"; // BMX-3 uses imported
  return zone_class === "IMX-1" ? "discretionary" : "not_permitted";
}

// Community-benefit ceilings by precinct. A null falls back to the
// § 21-9.100-5(e)(1)(A) formula, correct where a plan is silent.
export interface TodPlanStandards {
  /** core TOD Precinct, <= 1/4 mile */
  core_max_far: number | null;

  core_max_height: number | null;
  /** TIZ Precinct, 1/4 to 1/2 mile */
  tiz_max_far: number | null;
  tiz_max_height: number | null;
  /** figures came from the quarter-mile proxy, not the plan's own polygons */
  approximate?: boolean;
  source: string;
}

export const TOD_PLAN_STANDARDS: Record<string, TodPlanStandards> = {
  // Figs. 5-3 / 5-4, quarter-mile proxy
  "Ala Moana": {
    core_max_far: 10.0,
    core_max_height: 400,
    tiz_max_far: 7.0,
    tiz_max_height: 350,
    approximate: true,
    source:
      "Ala Moana Neighborhood TOD Plan Figs. 5-3 / 5-4, quarter-mile proxy; corroborated by Res. 20-174 (KCR 10.0/400ft), 17-175 (9.95/400ft), 17-221 (9.215/400ft), 20-315 (7.0/400ft)",
  },
  // Figs. 2-6 / 2-7, same proxy.
  Downtown: {
    core_max_far: 7.5,
    core_max_height: 400,
    tiz_max_far: 4.5,
    tiz_max_height: 250,
    approximate: true,
    source: "Downtown Neighborhood TOD Plan Figs. 2-6 / 2-7, quarter-mile proxy",
  },
  // Maps published but not yet read; parcels stay not_modeled.
  // Fig. 2-7. FAR map not transcribed.
  Kalihi: { core_max_far: null, core_max_height: 200, tiz_max_far: null, tiz_max_height: 150, approximate: true, source: "Kalihi Neighborhood TOD Plan Fig. 2-7, quarter-mile proxy" },
  // no plan height map published; base height governs
  Airport: { core_max_far: null, core_max_height: null, tiz_max_far: null, tiz_max_height: null, source: "no plan height map published; base height governs" },
  // heights come per parcel from TOD_Zoning - Proposed
  "East Kapolei": { core_max_far: null, core_max_height: null, tiz_max_far: null, tiz_max_height: null, source: "per-parcel heights from TOD_Zoning - Proposed" },
  // PD-T: the § 21-9.100-8 ladders apply instead
  Waipahu: { core_max_far: null, core_max_height: null, tiz_max_far: null, tiz_max_height: null, source: "PD-T; see § 21-9.100-8(a)(1)" },
  "Aiea-Pearl City": { core_max_far: null, core_max_height: null, tiz_max_far: null, tiz_max_height: null, source: "PD-T; see § 21-9.100-8(a)(1)" },
  Halawa: { core_max_far: null, core_max_height: null, tiz_max_far: null, tiz_max_height: null, source: "PD-T; see § 21-9.100-8(a)(1)" },
};

/** nulls where the plan is silent or untranscribed */
export function todPlanCeiling(
  station_area: string | null,
  precinct: "core" | "tiz"
): { far: number | null; height: number | null; approximate: boolean } {
  const std = station_area ? TOD_PLAN_STANDARDS[station_area] : undefined;
  if (!std) return { far: null, height: null, approximate: false };
  const approximate = std.approximate === true;
  return precinct === "core"
    ? { far: std.core_max_far, height: std.core_max_height, approximate }
    : { far: std.tiz_max_far, height: std.tiz_max_height, approximate };
}

// § 21-9.100-5(e)(2): where there is no draft neighborhood TOD plan, height may
// be up to twice the underlying limit or 450 ft, whichever is lower. Where a
// draft or approved plan exists its maximum governs, except that an existing
// higher limit prevails.
export function todHeightLimit(
  zone_class: string,
  lot_sqft: number,
  base_height: number,
  plan_height?: number
): number {
  if (!todEligible(zone_class, lot_sqft)) return base_height;
  if (plan_height != null) return Math.max(plan_height, base_height);
  return Math.max(base_height, Math.min(2 * base_height, TOD_MAX_HEIGHT_FT));
}

// calculate FAR based on bill 6 ordinanace (ONLY USE FOR BILL 6 PATH)
export function calcFarBill6(zone_class: string): number {
  // Ord. 26-7 changed the apartment districts only; business districts keep
  // Table 21-3.4
  if (zone_class in BUSINESS_FAR) return BUSINESS_FAR[zone_class];
  if (ZONE_GROUPS.lowDensity.includes(zone_class)) return 2.0;
  if (zone_class === "A-2" || zone_class === "AMX-2") return 3.0;
  if (
    zone_class === "A-3" ||
    zone_class === "AMX-3" ||
    ZONE_GROUPS.waikiki.includes(zone_class)
  )
    return 4.0;
  return 0;
}

// ROH Table 21-3.4 base FAR
const BUSINESS_FAR: Record<string, number> = {
  "B-1": 1.0,
  "B-2": 2.5,
  "BMX-3": 2.5,
  "BMX-4": 4.0,
};

const APARTMENT_ZONES = ["A-1", "A-2", "A-3", "AMX-1", "AMX-2", "AMX-3"];

// get lot coverage by zone class, tiered max building area
export function lotCoverage(zone_class: string, lot_sqft?: number): number {
  if (lot_sqft != null && APARTMENT_ZONES.includes(zone_class)) {
    if (lot_sqft < 7500) return 0.6;
    if (lot_sqft <= 20000) return 0.5;
    return 0.4;
  }
  return LOT_COVERAGE[zone_class] ?? 0.6;
}

// ord. 26-7 replaced lot coverage tiers with a flat 60% 
export function lotCoverageBill6(zone_class: string): number {
  return APARTMENT_ZONES.includes(zone_class)
    ? 0.6
    : (LOT_COVERAGE[zone_class] ?? 0.6);
}

// waikiki open space requirement
export const WAIKIKI_OPEN_SPACE = {
  low_far: 0.35,
  high_far: 0.5,
  far_threshold: 1.5,
};

export function waikikiOpenSpaceFrac(zone_class: string, far: number): number {
  if (!ZONE_GROUPS.waikiki.includes(zone_class)) return 0;
  return far < WAIKIKI_OPEN_SPACE.far_threshold
    ? WAIKIKI_OPEN_SPACE.low_far
    : WAIKIKI_OPEN_SPACE.high_far;
}

// lot coverage & open space don't stack, so the effective coverage is the minimum of the two
export function envelopeCoverage(
  zone_class: string,
  far: number,
  coverage: number
): number {
  return Math.min(coverage, 1 - waikikiOpenSpaceFrac(zone_class, far));
}

// default timing in months, all pathways
export const DEFAULT_PERMITTING_MONTHS = 18;
export const DEFAULT_CONST_MONTHS = 12;

// setback-limited footprint (sqft), assuming a 2:1 depth:width lot
export function setbackFootprint(
  lot_sqft: number,
  setback: number,
  ratio = 2
): number {
  const width = Math.sqrt(lot_sqft / ratio);
  const depth = ratio * width;
  const usable_width = Math.max(0, width - 2 * setback);
  const usable_depth = Math.max(0, depth - 2 * setback);
  return usable_width * usable_depth;
}

// footprint with separate yards, on the same 2:1 lot fronting its short side
export function yardFootprint(
  lot_sqft: number,
  front: number,
  rear: number,
  side: number,
  ratio = 2
): number {
  const width = Math.sqrt(lot_sqft / ratio);
  const depth = ratio * width;
  return Math.max(0, width - 2 * side) * Math.max(0, depth - front - rear);
}

// § 21-9.100-8(c)(1): no at-grade or ground-floor parking within this many
// feet of the front lot line in a TOD special district
export const PDT_FRONT_NO_PARKING_FT = 40;

// ground inside the yards within `depth` ft of the front lot line, on the
// same 2:1 lot fronting its short side
export function frontStripSqft(
  lot_sqft: number,
  setback: number,
  depth: number,
  ratio = 2
): number {
  const width = Math.sqrt(lot_sqft / ratio);
  return Math.max(0, width - 2 * setback) * Math.max(0, depth - setback);
}

// excavation depth by zone class
export function excavationDepthByZone(zone_class: string): number {
  if (ZONE_GROUPS.lowDensity.includes(zone_class)) return 3;
  if (
    zone_class === "A-2" ||
    zone_class === "AMX-2" ||
    zone_class === "B-2"
  )
    return 5;
  if (
    zone_class === "A-3" ||
    zone_class === "AMX-3" ||
    ZONE_GROUPS.waikiki.includes(zone_class) ||
    zone_class === "BMX-4"
  )
    return 9;
  return 4;
}

// building permit fee
export function buildingPermitFee(total_valuation: number): number {
  if (total_valuation <= 500) return 20;
  if (total_valuation <= 1000) return 8 + (total_valuation * 2.5) / 100;
  if (total_valuation <= 20000) return 12 + (total_valuation * 2.2) / 100;
  if (total_valuation <= 50000)
    return 82 + ((total_valuation - 20000) * 18) / 1000;
  if (total_valuation <= 100000)
    return 286 + ((total_valuation - 50000) * 14) / 1000;
  if (total_valuation <= 500000)
    return 700 + ((total_valuation - 100000) * 10) / 1000;
  if (total_valuation <= 2000000)
    return 3200 + ((total_valuation - 500000) * 5) / 1000;
  return 4300 + ((total_valuation - 2000000) * 4.5) / 1000;
}

// plan review fee
export function planReviewFee(original_permit_fee: number): number {
  const fee = original_permit_fee * 0.1;
  if (fee < 200) return 200;
  if (fee > 25000) return 25000;
  return fee;
}

// special district processing fee
export function specialDistrictFee(lot_sqft: number): number {
  const acres = lot_sqft / 43560;
  const decimal_part = acres - Math.floor(acres);
  const acres_rounded =
    decimal_part >= 0.45 ? Math.ceil(acres) : Math.floor(acres);
  const fee = 800 + 300 * acres_rounded;
  return Math.min(fee, 15000);
}

// special district total application fee
export function specialDistrictTotal(lot_sqft: number): number {
  return 400 + specialDistrictFee(lot_sqft);
}

// wastewater system facility charge
export function wastewaterFee(
  total_units: number,
  chargeable_units: number = total_units
): number {
  const esdu_per_unit = total_units >= 5 ? 0.7 : 1.0;
  return chargeable_units * esdu_per_unit * FEES.wastewater_charge_per_esdu;
}

// grubbing permit
export function grubbingPermit(sqft: number): number {
  if (sqft < 15001) return 0;
  if (sqft <= 16000) return 125;
  return 125 + Math.ceil((sqft - 16000) / 1000) * 15;
}

// grading permit
export function gradingPermit(cubic_yards: number): number {
  if (cubic_yards <= 1000) return 505 + Math.ceil(cubic_yards / 100) * 55;
  if (cubic_yards < 10000)
    return 1000 + Math.ceil((cubic_yards - 1000) / 1000) * 55;
  return 1495 + Math.ceil((cubic_yards - 10000) / 1000) * 35;
}

// stockpiling permit
export function stockpilingPermit(cubic_yards: number): number {
  if (cubic_yards < 101) return 0;
  if (cubic_yards <= 1100) return 70;
  return 70 + Math.ceil((cubic_yards - 1100) / 1000) * 15;
}

// height step-back ("wedding cake"), side and rear yards unless front is set
export type StepBack = {
  trigger_ft: number;
  above_ft: number;
  ft_per_10ft: number;
  front?: boolean;
};

// LUO height setbacks: § 21-3.80-1(c), § 21-3.90-1(c), Ord. 17-55,
// § 21-3.100-1(c), § 21-9.80-5(c). BMX-4 takes the BMX-3 rule in place of its
// street-angle plane.
const STEPBACK_ABOVE_40 = [
  "A-2",
  "A-3",
  "AMX-2",
  "AMX-3",
  "B-2",
  "BMX-3",
  "BMX-4",
  "IMX-1",
];

export function zoneStepBack(zone_class: string): StepBack | undefined {
  if (STEPBACK_ABOVE_40.includes(zone_class))
    return { trigger_ft: 40, above_ft: 40, ft_per_10ft: 1 };
  if (zone_class === "Resort")
    return { trigger_ft: 30, above_ft: 30, ft_per_10ft: 1 };
  if (ZONE_GROUPS.waikiki.includes(zone_class))
    return { trigger_ft: 40, above_ft: 40, ft_per_10ft: 1, front: true };
  return undefined;
}

// the sliders' step-back if set, otherwise the zone's own
export function stepBackOf(
  s: SliderInputs,
  zone_default?: StepBack
): StepBack | undefined {
  if (s.stepback_trigger_ft == null) return zone_default;
  return {
    trigger_ft: s.stepback_trigger_ft,
    above_ft: s.stepback_above_ft ?? 40,
    ft_per_10ft: s.stepback_ft_per_10ft ?? 1,
  };
}

// floor plate of each storey, ground first
export function floorPlates(i: {
  floors: number;
  floor_height: number;
  height_limit: number;
  lot_sqft: number;
  coverage_plate: number;
  setback: number;
  stepback?: StepBack;
}): number[] {
  const plates: number[] = [];
  for (let k = 1; k <= i.floors; k++) {
    let extra = 0;
    if (i.stepback && i.height_limit > i.stepback.trigger_ft) {
      const above = k * i.floor_height - i.stepback.above_ft;
      if (above > 0)
        extra = Math.ceil(above / 10 - 1e-9) * i.stepback.ft_per_10ft;
    }
    plates.push(
      Math.max(
        0,
        Math.min(
          i.coverage_plate,
          yardFootprint(
            i.lot_sqft,
            i.setback + (i.stepback?.front ? extra : 0),
            i.setback + extra,
            i.setback + extra
          )
        )
      )
    );
  }
  return plates;
}

// smallest footprint that fits `area` within each storey's plate
function slimFootprint(plates: number[], area: number): number {
  const fits = (f: number) =>
    plates.reduce((sum, p) => sum + Math.min(f, p), 0) >= area - 1e-6;
  let lo = 0;
  let hi = plates[0] ?? 0;
  if (!fits(hi)) return hi;
  for (let n = 0; n < 60; n++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

// building envelope with surface or podium parking; parking counts toward
// height, not FAR
export function podiumEnvelope(i: {
  plates: number[];
  far_cap: number;
  // most ground-floor retail the zone allows (sqft); 0 for none
  retail_cap: number;
  retail_share: number;
  unit_size: number;
  parking_ratio: number;
  // stalls required per sqft of ground-floor retail (Table 21-6.1); 0 for none
  retail_stalls_per_sqft?: number;
  // Table 21-6.2 rate when housing and retail share stalls and loading
  joint_use?: number;
  // § 21-6.110: reserve ground for the required loading spaces
  loading?: boolean;
  // § 21-6.40: reserve ground for the required bicycle parking
  bicycle?: boolean;
  // ground-floor area along the front where no stalls or loading may go
  // (§ 21-9.100-8(c)); the building's frontage holds retail, lobby or housing
  front_strip_sqft?: number;
  // a legal cap on units (Bill 7)
  max_units?: number;
  // a cap on the unit count; only the floor area those units need is built
  unit_cap?: number;
}) {
  const plates = i.plates;
  const floors = plates.length;
  const ground = plates[0] ?? 0;
  const retail_sqft = Math.max(
    0,
    Math.min(i.retail_cap, i.retail_share * ground, i.far_cap)
  );
  const retail_stalls = retail_sqft * (i.retail_stalls_per_sqft ?? 0);
  const parking = i.parking_ratio > 0 || retail_stalls > 0;
  // housing and retail share the stalls (Table 21-6.2)
  const joint =
    i.parking_ratio > 0 && retail_stalls > 0 ? (i.joint_use ?? 1) : 1;
  const stallsFor = (units: number) =>
    roundHalfUp(joint * (i.parking_ratio * units + retail_stalls));
  // most units whose stalls fit `capacity`; stallsFor rises with units
  const unitsFor = (capacity: number) => {
    if (stallsFor(0) > capacity) return 0;
    if (i.parking_ratio <= 0) return Infinity;
    let lo = 0;
    let hi = 1;
    while (stallsFor(hi) <= capacity) hi *= 2;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (stallsFor(mid) <= capacity) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const above = new Array<number>(floors + 1).fill(0);
  for (let j = floors - 1; j >= 0; j--) above[j] = above[j + 1] + plates[j];
  // a unit-count cap limits the floor area, so only those units are built
  if (i.unit_cap != null)
    i = {
      ...i,
      far_cap: Math.min(
        i.far_cap,
        retail_sqft + (i.unit_cap * i.unit_size) / EFFICIENCY + 1e-6
      ),
    };
  const stallsOn = (sqft: number) => Math.floor(sqft / PARKING.stall_sqft);
  // storeys needed to hold `sqft`, filling from the first
  const storeysFor = (storeys: number[], sqft: number) => {
    let count = 0;
    for (
      let j = 0, filled = 0;
      j < storeys.length && filled < sqft - 1e-9;
      j++
    ) {
      filled += storeys[j];
      count++;
    }
    return count;
  };

  // loading spaces, sized for the most units the envelope holds
  const most_units = Math.min(
    Math.floor(
      (Math.max(0, Math.min(i.far_cap, above[0]) - retail_sqft) * EFFICIENCY) /
        i.unit_size
    ),
    i.max_units ?? Infinity
  );
  const loading_spaces = i.loading
    ? loadingSpaces(most_units, retail_sqft, i.joint_use ?? 1)
    : 0;
  // § 21-6.40: bicycle parking, sized the same way
  const bicycle = i.bicycle
    ? bicycleSpaces(most_units, retail_sqft, retail_stalls)
    : { short_term: 0, long_term: 0 };
  // loading and bicycle parking take ground in the parking area
  const loading_sqft =
    loadingSqft(loading_spaces) +
    (bicycle.short_term + bicycle.long_term) * BICYCLE_PARKING.sqft_per_space;
  // the front strip keeps parking and loading behind the building's frontage
  const front_strip = Math.min(ground, i.front_strip_sqft ?? 0);

  // surface lot first: if every stall fits on the ground plate a slimmer
  // building leaves open, no parking is built into the building
  if (parking) {
    const residential_sqft = Math.max(
      0,
      Math.min(i.far_cap, above[0]) - retail_sqft
    );
    const units = Math.min(
      Math.floor((residential_sqft * EFFICIENCY) / i.unit_size),
      i.max_units ?? Infinity
    );
    const stalls = stallsFor(units);
    const footprint = slimFootprint(plates, residential_sqft + retail_sqft);
    // the building fronts the street; open ground in the strip stays unpaved
    const open = Math.max(0, ground - Math.max(footprint, front_strip));
    if (
      stalls <= Math.floor((open - loading_sqft) / PARKING.surface_stall_sqft)
    ) {
      const parking_sqft = stalls * PARKING.surface_stall_sqft + loading_sqft;
      // the building only slims as far as the lot needs
      const built = Math.max(
        footprint,
        Math.min(ground - parking_sqft, residential_sqft + retail_sqft)
      );
      const gross_sqft = residential_sqft + retail_sqft + parking_sqft;
      let living_stories = 0;
      for (
        let j = 0, filled = 0;
        j < floors && filled < residential_sqft - 1e-9;
        j++
      ) {
        filled += Math.min(built, plates[j]);
        living_stories++;
      }
      return {
        residential_sqft,
        retail_sqft,
        lobby_sqft: 0,
        units,
        stalls,
        surface_stalls: stalls,
        ground_floor_stalls: 0,
        podium_stalls: 0,
        loading_spaces,
        bicycle_short_term: bicycle.short_term,
        bicycle_long_term: bicycle.long_term,
        podium_levels: 0,
        built_floors: storeysFor(
          plates.map((plate) => Math.min(built, plate)),
          residential_sqft + retail_sqft
        ),
        parking_sqft,
        parking_cost: parking_sqft * PARKING.surface_cost_per_sqft,
        parking_share: gross_sqft > 0 ? parking_sqft / gross_sqft : 0,
        living_stories,
      };
    }
  }

  const firstResidential = (podium_levels: number) =>
    parking ? Math.min(floors, 1 + podium_levels) : 0;
  const residentialAt = (podium_levels: number) => {
    const by_height = parking
      ? above[firstResidential(podium_levels)]
      : above[0] - retail_sqft - loading_sqft;
    const residential_sqft = Math.max(
      0,
      Math.min(i.far_cap - retail_sqft, by_height)
    );
    const by_area = Math.floor((residential_sqft * EFFICIENCY) / i.unit_size);
    const units = Math.min(by_area, i.max_units ?? Infinity);
    return { residential_sqft, units };
  };

  // without a podium, the ground floor left after its stalls is housing when
  // a unit fits there
  const ground_stalls = parking
    ? stallsOn(
        Math.max(0, ground - loading_sqft - Math.max(retail_sqft, front_strip))
      )
    : 0;
  const groundLeft = (stalls: number) =>
    Math.max(
      0,
      ground - retail_sqft - loading_sqft - stalls * PARKING.stall_sqft
    );
  const groundHousing = (stalls: number) =>
    groundLeft(stalls) >= i.unit_size / EFFICIENCY ? groundLeft(stalls) : 0;
  const fit = (sqft: number) =>
    Math.min(
      Math.floor((sqft * EFFICIENCY) / i.unit_size),
      i.max_units ?? Infinity
    );

  // units at a podium height: the fewer of what the floors hold and what
  // the stalls allow, settled since stalls take ground-floor housing
  const optionAt = (podium_levels: number, capacity: number) => {
    const room = (stalls: number) =>
      Math.max(
        0,
        Math.min(
          i.far_cap - retail_sqft,
          above[firstResidential(podium_levels)] +
            (podium_levels === 0 ? groundHousing(stalls) : 0)
        )
      );
    const by_stalls = unitsFor(capacity);
    // the most units whose stalls leave room for them; more units need more
    // stalls and so leave less room, so the test only fails above the answer
    const fits = (u: number) => fit(room(stallsFor(u))) >= u;
    let lo = 0;
    let hi = Math.min(fit(room(0)), by_stalls);
    if (fits(hi)) lo = hi;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    const units = lo;
    const sqft = room(stallsFor(units));
    const by_area = fit(sqft);
    return {
      units,
      // build only the floor area the parked units need
      residential_sqft:
        units < by_area
          ? Math.min(sqft, (units * i.unit_size) / EFFICIENCY)
          : sqft,
      stall_bound: units < by_area,
    };
  };

  // keep the podium that yields the most units
  let podium_levels = 0;
  let res = residentialAt(0);
  if (parking) {
    let capacity = ground_stalls;
    let best = -1;
    for (let k = 0; k < Math.max(1, floors); k++) {
      if (k > 0) capacity += stallsOn(plates[k]);
      const option = optionAt(k, capacity);
      if (option.units > best) {
        best = option.units;
        podium_levels = k;
        res = option;
      }
      // once stalls stop limiting units, a taller podium only loses floors
      if (!option.stall_bound) break;
    }
  }
  const stalls = stallsFor(res.units);
  const ground_housing =
    parking && podium_levels === 0 ? groundHousing(stalls) : 0;

  const ground_parking_sqft =
    Math.min(stalls, ground_stalls) * PARKING.stall_sqft;
  // podium floors are built whole, however full the top one is
  const podium_sqft = parking
    ? above[Math.min(1, floors)] - above[firstResidential(podium_levels)]
    : 0;
  // ground floor too small for a unit: lobby, loading, circulation
  const lobby_sqft =
    parking && ground_housing === 0
      ? Math.max(0, ground - retail_sqft - loading_sqft - ground_parking_sqft)
      : 0;
  const parking_sqft = ground_parking_sqft + podium_sqft + loading_sqft;
  const gross_sqft =
    res.residential_sqft + retail_sqft + lobby_sqft + parking_sqft;

  const storeys = [
    ...(ground_housing > 0 ? [ground_housing] : []),
    ...plates.slice(firstResidential(podium_levels)),
  ];
  let living_stories = 0;
  for (
    let j = 0, filled = 0;
    j < storeys.length && filled < res.residential_sqft - 1e-9;
    j++
  ) {
    filled += storeys[j];
    living_stories++;
  }

  // with parking: the ground floor, the podium, then the housing above them
  const built_floors = !parking
    ? storeysFor(plates, res.residential_sqft + retail_sqft + loading_sqft)
    : res.units === 0 && retail_sqft === 0
      ? 0
      : 1 +
        podium_levels +
        storeysFor(
          plates.slice(firstResidential(podium_levels)),
          res.residential_sqft - ground_housing
        );

  return {
    residential_sqft: res.residential_sqft,
    retail_sqft,
    lobby_sqft,
    units: res.units,
    stalls,
    surface_stalls: 0,
    ground_floor_stalls: Math.min(stalls, ground_stalls),
    podium_stalls: stalls - Math.min(stalls, ground_stalls),
    loading_spaces,
    bicycle_short_term: bicycle.short_term,
    bicycle_long_term: bicycle.long_term,
    podium_levels,
    built_floors,
    parking_sqft,
    parking_cost: parking_sqft * PARKING.cost_per_sqft,
    parking_share: gross_sqft > 0 ? parking_sqft / gross_sqft : 0,
    living_stories,
  };
}

// parking: calculate annual parking income
export function calcParkingIncome(stalls: number): number {
  return stalls * PARKING.monthly_rent_per_stall * 12;
}

// bicycle parking: racks and lockers (their floor area is in the envelope)
export function calcBicycleParkingCost(
  short_term: number,
  long_term: number
): number {
  return (
    short_term * BICYCLE_PARKING.short_term.cost_per_space +
    long_term * BICYCLE_PARKING.long_term.cost_per_space
  );
}

// HHFDC affordable sale price lookup
export function getAffordablePrice(
  unit_type: string,
  ami: number,
  rate: number
): number {
  const table = HHFDC_TABLES[unit_type] ?? HHFDC_TABLES["two_bb"];
  // round AMI to nearest 10%, and the lowest is 50% AMI for sales
  const ami_key = `ami_${Math.max(50, Math.round(ami * 100))}`;

  // find closest rate
  const rate_idx = HHFDC_RATES.reduce(
    (best, r, i) =>
      Math.abs(r - rate) < Math.abs(HHFDC_RATES[best] - rate) ? i : best,
    0
  );
  const closest_rate = HHFDC_RATES[rate_idx];
  const price = table[closest_rate]?.[ami_key] ?? 0;
  return price;
}

// solve for IRR given a cash flow (monthly)
export function solveIRR(cashflows: number[], isMonthly: boolean): number {
  const hasPositive = cashflows.some((cf) => cf > 0);
  const hasNegative = cashflows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) return NaN;

  // horner's method for evaluating the polynomial efficiently
  const n = cashflows.length;
  const npv = (r: number) => {
    const d = 1 / (1 + r);
    let acc = 0;
    for (let t = n - 1; t >= 0; t--) acc = acc * d + cashflows[t];
    return acc;
  };

  let lo = -0.95;
  let hi = isMonthly ? 1.0 : 10.0;

  let npvLo = npv(lo);
  let npvHi = npv(hi);

  if (!Number.isFinite(npvLo) || !Number.isFinite(npvHi)) return NaN;
  if (npvLo * npvHi > 0) return NaN;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = npv(mid);

    if (!Number.isFinite(npvMid)) return NaN;

    if (Math.abs(npvMid) < 1e-7 || (hi - lo) / 2 < 1e-10) {
      return isMonthly ? Math.pow(1 + mid, 12) - 1 : mid;
    }

    if (npvLo * npvMid < 0) {
      hi = mid;
      npvHi = npvMid;
    } else {
      lo = mid;
      npvLo = npvMid;
    }
  }
  return NaN;
}

// =========================================================
// SHARED PIPELINE FUNCTIONS
// =========================================================

// construction soft costs
export function calcSoftCosts(i: SoftCostInputs): SoftCostBreakdown {
  const market_units = Math.max(0, i.max_units - i.affordable_units);

  // units charged for the three waivable city fees.
  const chargeable_units =
    i.waivable_fee_basis === "none"
      ? 0
      : i.waivable_fee_basis === "market_units"
        ? market_units
        : i.max_units;

  // the same toggle sets the BWS water charges, with the waiver capped per project
  const water_chargeable_units =
    i.waivable_fee_basis === "none"
      ? 0
      : i.waivable_fee_basis === "market_units"
        ? i.max_units - Math.min(i.affordable_units, WSFC_WAIVER_UNIT_CAP)
        : i.max_units;
  const water = calcWaterFees({
    max_units: i.max_units,
    water_chargeable_units,
    living_stories: i.living_stories,
    fu_per_unit: i.fu_per_unit,
  });

  // permit and plan review scale with construction value per unit.
  const per_unit_cost = i.hard_cost / Math.max(i.max_units, 1);
  const permit_fee = buildingPermitFee(per_unit_cost);
  const plan_fee = planReviewFee(permit_fee);

  const cubic_yards = (i.lot_sqft * i.excavation_depth) / 27;

  // exempt = application fee only; in_lieu = application fee + FMV of park land
  const park_dedication =
    i.park === "none"
      ? 0
      : i.park === "exempt"
        ? FEES.park_dedication.exempt
        : FEES.park_dedication.in_lieu + i.park_area * i.land_cost_per_sqft;

  const b = {
    environmental: FEES.environment.ea + FEES.environment.eis,
    building_permit: chargeable_units * permit_fee,
    plan_review: chargeable_units * plan_fee,
    wastewater: wastewaterFee(i.max_units, chargeable_units),
    wsfc: water.wsfc,
    water_meter: water.water_meter,
    temp_occupancy: FEES.administrative.temp_occupancy_cert,
    park_dedication,
    escp: FEES.civil.escp,
    utilities:
      (FEES.civil.installation_trench + FEES.civil.service_connection) *
      i.max_units,
    grubbing: grubbingPermit(i.lot_sqft),
    stockpiling: stockpilingPermit(cubic_yards),
    grading: gradingPermit(cubic_yards),
    impact: i.impact_fee_per_unit * i.max_units,
    construction_mgmt: i.hard_cost * CONSTRUCTION_MGMT_RATE,
    zoning_application: i.zoning_application_fee ?? 0,
    special_district: i.special_district_fee ?? 0,
  };

  return { ...b, total: Object.values(b).reduce((s, v) => s + v, 0) };
}

// pre-development equity, monthly equity outflows during permitting
export function calcPredevEquity(
  construct_cost: number,
  permitting_months: number,
  equity_amount: number
): {
  monthly_predev_spend: number;
  total_predev_cost: number;
  construction_equity: number;
} {
  const monthly_predev_spend = (construct_cost * FINANCING.cost_carried) / 12;
  const total_predev_cost = monthly_predev_spend * permitting_months;
  // equity left for closing once predev is funded; never negative, the loan
  // funds anything past the developer's equity (see equityFirstDraws)
  const construction_equity = Math.max(0, equity_amount - total_predev_cost);

  return {
    monthly_predev_spend,
    total_predev_cost,
    construction_equity,
  };
}

// equity-first draw schedule for a dev flip
export function equityFirstDraws(
  equity_amount: number,
  land_cost: number,
  monthly_predev_spend: number,
  permitting_months: number
): number[] {
  const draws: number[] = new Array(permitting_months + 1).fill(0);
  let remaining = Math.max(0, equity_amount);
  const take = (amount: number) => {
    const d = Math.min(amount, remaining);
    remaining -= d;
    return d;
  };
  draws[0] -= take(land_cost);
  for (let m = 0; m < permitting_months; m++) {
    draws[m] -= take(monthly_predev_spend);
  }
  // whatever is left is the construction equity at close
  draws[permitting_months] -= remaining;
  return draws;
}

// cumulative share of the construction loan drawn by progress point x (0-1)
export function drawCurve(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return 3 * t * t - 2 * t * t * t;
}

// construction interest on an S-curve draw schedule to distribute the cashflow realistically
export function calcConstructionInterest(
  loan_principal: number,
  const_months: number,
  annual_rate: number
): { total_interest: number; final_principal: number } {
  // no construction period: the loan is drawn with no time to accrue
  if (const_months <= 0)
    return { total_interest: 0, final_principal: loan_principal };

  const monthly_rate = (1 + annual_rate) ** (1 / 12) - 1;
  let running_principal = 0;
  let total_interest = 0;
  let drawn_share = 0;

  for (let month = 1; month <= const_months; month++) {
    // draws are non-negative at any term & sum to the loan principal
    const share = drawCurve(month / const_months);
    const draw_amount = (share - drawn_share) * loan_principal;
    drawn_share = share;

    const interest = monthly_rate * (draw_amount + running_principal);
    total_interest += interest;
    running_principal += draw_amount + interest;
  }

  return { total_interest, final_principal: running_principal };
}

// lease-up & sales carry
export function calcLeaseupCarry(
  principal: number,
  rental_units: number,
  sale_units: number,
  annual_rate: number,
  leaseup_override?: number
): {
  leaseup_months: number;
  sales_months: number;
  total_carry_months: number;
  carry_interest: number;
  final_principal: number;
} {
  let leaseup_months = 0;
  if (leaseup_override != null && leaseup_override > 0) {
    leaseup_months = leaseup_override; // ← user slider wins
  } else if (rental_units > 0) {
    // note: "else if" now
    const target_units = Math.ceil(rental_units * TIMING.target_occupancy);
    leaseup_months =
      Math.ceil(target_units / TIMING.absorption_units_per_month) +
      TIMING.stabilization;
  }

  const sales_months =
    sale_units > 0 ? Math.ceil(sale_units / TIMING.monthly_sale_cap) : 0;

  let total_carry_months = Math.max(leaseup_months, sales_months);
  if (total_carry_months === 0) {
    total_carry_months = TIMING.stabilization;
  }

  const monthly_rate = (1 + annual_rate) ** (1 / 12) - 1;
  let running_principal = principal;
  let carry_interest = 0;

  for (let month = 1; month <= total_carry_months; month++) {
    const interest = monthly_rate * running_principal;
    carry_interest += interest;
    running_principal += interest;
  }

  return {
    leaseup_months,
    sales_months,
    total_carry_months,
    carry_interest,
    final_principal: running_principal,
  };
}

// developer RLV, maximum supportable land price (static residual)
export function calcDevRLV(
  gdv: number,
  dev_cost: number,
  total_financing_cost: number,
  // grant cash by month (bill 7); empty for none
  grant_flows: number[],
  lot_sqft: number,
  total_months: number,
  land_rate: number = DEFAULT_TARGET_RETURN,
  profit_margin: number = DEFAULT_PROFIT_MARGIN
): {
  selling_costs: number;
  grants_pv: number;
  profit: number;
  project_cost: number;
  land_carry: number;
  rlv: number;
  rlv_sqft: number;
} {
  const selling_costs = gdv * FINANCING.disposition_cost;

  const project_cost = dev_cost + total_financing_cost;
  const profit = project_cost * profit_margin;

  const residual = gdv - selling_costs - project_cost - profit;

  // land carry: only the land is paid at t=0
  const land_carry = (1 + land_rate) ** (total_months / 12);
  // grants discounted from the month each is paid
  const grants_pv = grant_flows.reduce(
    (sum, g, m) => sum + g / (1 + land_rate) ** (m / 12),
    0
  );
  const rlv = residual / land_carry + grants_pv;
  const rlv_sqft = rlv / lot_sqft;

  return {
    selling_costs: Math.round(selling_costs),
    grants_pv: Math.round(grants_pv),
    profit: Math.round(profit),
    project_cost: Math.round(project_cost),
    land_carry,
    rlv: Math.round(rlv),
    rlv_sqft: Math.round(rlv_sqft * 100) / 100,
  };
}

// stabilized-year property tax (NOI is an after-tax figure)
// programs with exemptions (Bill 7, TOD) pay tax on land only while the exemption runs
export function calcPropertyTax(
  land_value: number,
  improvement_value: number,
  exempt_improvements: boolean = false
): number {
  const assessed = exempt_improvements
    ? land_value
    : land_value + improvement_value;
  return assessed * FINANCING.rpt_residential;
}

// split a whole building tax bill across the residential and retail NOI lines
export function allocatePropertyTax(
  prop_tax: number,
  residential_egi: number,
  retail_egi: number
): { residential_tax: number; retail_tax: number } {
  const total = residential_egi + retail_egi;
  if (total <= 0) return { residential_tax: prop_tax, retail_tax: 0 };
  const retail_tax = (prop_tax * retail_egi) / total;
  return { residential_tax: prop_tax - retail_tax, retail_tax };
}

// permanent loan
// annual debt service per $1 borrowed at the permanent rate and amortization
export function calcAnnualLoanConstant(
  permanent_rate: number,
  amort_years: number
): number {
  const monthly_r = permanent_rate / 12;
  const n_pmts = amort_years * 12;
  if (n_pmts <= 0) return 0;
  if (monthly_r <= 0) return 1 / amort_years;
  return (
    (12 * (monthly_r * Math.pow(1 + monthly_r, n_pmts))) /
    (Math.pow(1 + monthly_r, n_pmts) - 1)
  );
}

// DSCR-implied take-out: the largest permanent loan whose annual debt service
// stabilized NOI covers at min_dscr
export function calcDscrMaxLoan(
  noi: number,
  permanent_rate: number,
  amort_years: number,
  min_dscr: number
): number {
  const annual_constant = calcAnnualLoanConstant(permanent_rate, amort_years);
  return noi > 0 && annual_constant > 0
    ? noi / (min_dscr * annual_constant)
    : 0;
}

// Construction-loan sizing:
// two loans, one for each framework the card reports
// loan A (RLV basis): sized on construction cost only
// loan B (deal basis): sized on construction cost plus land
// where the DSCR binds the two coincide; they differ only when LTC is binding
export function sizeConstructionLoan(
  amount_to_finance: number,
  equity_floor: number,
  ltc_stabilized_balance: number,
  take_out: number | null
): {
  loan_principal: number;
  equity_amount: number;
  equity_pct_realized: number;
  dscr_binds: boolean;
} {
  const ltc_principal = amount_to_finance * (1 - equity_floor);
  const balance_per_dollar =
    ltc_principal > 0 ? ltc_stabilized_balance / ltc_principal : 0;
  const take_out_principal =
    take_out == null || balance_per_dollar <= 0
      ? Infinity
      : take_out / balance_per_dollar;
  const dscr_binds = take_out_principal < ltc_principal;
  const loan_principal = Math.max(
    0,
    Math.min(ltc_principal, take_out_principal)
  );
  const equity_amount = Math.max(0, amount_to_finance - loan_principal);
  return {
    loan_principal,
    equity_amount,
    equity_pct_realized:
      amount_to_finance > 0 ? equity_amount / amount_to_finance : equity_floor,
    dscr_binds,
  };
}

export function calcPermanentLoan(
  loan_balance: number,
  noi: number,
  permanent_rate: number,
  hold_years: number,
  amort_years: number = HOLD.amort_years,
  min_dscr: number = 1.2
): {
  perm_principal: number;
  monthly_pmt: number;
  annual_debt_svc: number;
  dscr: number;
  is_bankable: boolean;
  remaining_bal: number;
  equity_gap: number;
} {
  const monthly_r = permanent_rate / 12;
  const n_pmts = amort_years * 12;

  // annual debt service per $1 of loan
  const annual_constant = calcAnnualLoanConstant(permanent_rate, amort_years);

  // DSCR constrained max loan
  const dscr_max_loan = calcDscrMaxLoan(
    noi,
    permanent_rate,
    amort_years,
    min_dscr
  );

  // actual permanent loan is the smaller of remins vs dscr constrained max loan
  const sized_loan = Math.max(0, Math.min(loan_balance, dscr_max_loan));

  // developer must fund with additional equity at refinance if short of $$
  const equity_gap = Math.max(0, loan_balance - sized_loan);

  const monthly_pmt = sized_loan * (annual_constant / 12);
  const annual_debt_svc = sized_loan * annual_constant;
  const dscr = annual_debt_svc > 0 ? noi / annual_debt_svc : Infinity;

  const pmts_made = hold_years * 12;
  const remaining_bal =
    sized_loan *
    ((Math.pow(1 + monthly_r, n_pmts) - Math.pow(1 + monthly_r, pmts_made)) /
      (Math.pow(1 + monthly_r, n_pmts) - 1));

  return {
    perm_principal: Math.round(sized_loan),
    monthly_pmt: Math.round(monthly_pmt),
    annual_debt_svc: Math.round(annual_debt_svc),
    dscr: Math.round(dscr * 1000) / 1000,
    // a DSCR-sized loan is set to exactly min_dscr, so the recomputed DSCR
    // is different by the 8~9th decimal place, so use a small tolerance
    is_bankable: dscr >= min_dscr - 1e-9,
    remaining_bal: Math.round(remaining_bal),
    equity_gap: Math.round(equity_gap),
  };
}

// zero output helper
export function zeroOutput(
  tmk: string,
  zone_class: string,
  lot_sqft: number,
  height_limit = 0
): ParcelOutput {
  return {
    tmk,
    zone_class,
    lot_sqft,
    height_limit,
    buildable_sqft: 0,
    net_residential_sqft: 0,
    net_commercial_sqft: 0,
    max_units: 0,
    parking_stalls: 0,
    podium_levels: 0,
    built_floors: 0,
    built_height: 0,
    parking_sqft: 0,
    parking_share: 0,
    affordable_units: 0,
    afd_rent_units: 0,
    mkt_rent_units: 0,
    afd_sale_units: 0,
    mkt_sale_units: 0,
    hard_cost: 0,
    soft_cost: 0,
    dev_cost: 0,
    total_financing_cost: 0,
    rlv_financing_cost: 0,
    pre_construction_subsidy: 0,
    equity_amount: 0,
    loan_balance_at_stab: 0,
    permitting_months: 0,
    const_months: 0,
    leaseup_months: 0,
    sales_months: 0,
    total_carry_months: 0,
    total_months: 0,
    project_years: 0,
    pri: 0,
    pgi: 0,
    residential_egi: 0,
    retail_pgi: 0,
    retail_egi: 0,
    egi: 0,
    gross_sales: 0,
    afd_sales: 0,
    mkt_sales: 0,
    residential_opex: 0,
    retail_opex: 0,
    operating_expenses: 0,
    property_tax: 0,
    noi: 0,
    cap_rate: 0,
    gdv: 0,
    dev_strategy: "dev_flip",
    dev_hold_years: 0,
    dev_post_grant: 0,
    dev_land_cost: 0,
    dev_total_dev_cost: 0,
    dev_capital_subsidy: 0,
    dev_net_dev_cost: 0,
    dev_levered_irr: 0,
    dev_equity_multiple: 0,
    dev_profit: 0,
    dev_roc: 0,
    dev_equity_invested: 0,
    dev_equity_out: 0,
    dev_gdv: 0,
    dev_selling_costs: 0,
    dev_loan_payoff: 0,
    dev_perm_principal: null,
    dev_perm_rate: null,
    dev_annual_debt_svc: null,
    dev_dscr: null,
    dev_equity_pct_realized: 0,
    dev_dscr_binds: false,
    dev_is_bankable: null,
    dev_cash_on_cash: null,
    dev_entry_cap: null,
    dev_exit_cap: null,
    dev_yr1_prop_tax: null,
    dev_investment_spread: 0,
    dev_target_roc: 0,
    dev_is_feasible: false,
    total_predev_cost: 0,
    construction_equity: 0,
    rlv_selling_costs: 0,
    rlv_grants_pv: 0,
    rlv_land_carry: 1,
    rlv_profit: 0,
    rlv_project_cost: 0,
    rlv: 0,
    rlv_sqft: 0,
    dev_roi: 0,
  };
}
