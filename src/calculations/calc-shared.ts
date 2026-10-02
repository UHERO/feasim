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
  "BMX-2": 266.91,
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
  mixedUse: ["AMX-1", "AMX-2", "AMX-3", "BMX-2", "BMX-3", "BMX-4", "ApartMix"],
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
  if (zone_class === "AMX-2" || zone_class === "BMX-2")
    return COMMERCIAL_COVERAGE.commercial2;
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
  // affordable units stay AMI-capped, so track AMI growth
  annual_affordable_rent_growth: 0.04,
  // market units follow market rent (Apartments.com Honolulu YoY)
  annual_market_rent_growth: 0.032,
  // blended hold-period rent growth (affordable 4% / market 3.2%); see note
  annual_rent_growth: 0.035,
  // operating expenses trend on their own series rather than as a fixed share of EGI
  annual_opex_growth: 0.035,
  // 2%/yr is the property-tax escalation
  annual_assessment_growth: 0.02,
  exit_cap_spread: 0.005,
  tax_exemption_years: 15,
};

// cap rates by zone class
export const CAP_RATES: Record<string, number> = {
  // metro class_c (low-rise)
  "A-1": (0.056 + 0.059) / 2,
  "AMX-1": (0.056 + 0.059) / 2,
  "R-5": (0.056 + 0.059) / 2,
  low_rise: (0.056 + 0.059) / 2,
  // metro class_b (mid-rise)
  "A-2": (0.0495 + 0.0524) / 2,
  "AMX-2": (0.0495 + 0.0524) / 2,
  "B-2": (0.0495 + 0.0524) / 2,
  "BMX-2": (0.0495 + 0.0524) / 2,
  mid_rise: (0.0495 + 0.0524) / 2,
  // metro class_a (high-rise)
  "A-3": (0.049 + 0.0517) / 2,
  "AMX-3": (0.049 + 0.0517) / 2,
  "BMX-3": (0.049 + 0.0517) / 2,
  "BMX-4": (0.049 + 0.0517) / 2,
  // Waikiki apartment precincts sit above metro class_a on their own
  Apart: 0.054,
  ApartMix: 0.054,
};

// required return-on-cost spread over cap rate (150 bps)
export const DEFAULT_TARGET_SPREAD = 0.015;

// land carry rate: annual cost of capital on the land purchase
export const DEFAULT_TARGET_RETURN = 0.115;

// developer profit as a margin on total project cost (dev cost + finance)
export const DEFAULT_PROFIT_MARGIN = 0.15;

// slider override if provided, else the cap rate for the zone
export function resolveCapRate(zone_class: string, override?: number): number {
  if (override != null && override > 0) return override;
  return CAP_RATES[zone_class] ?? CAP_RATES["low_rise"];
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
  "BMX-2": 1.0,
  "BMX-3": 1.0,
  "BMX-4": 1.0,
};

// commercial coverage fraction of lot_sqft
export const COMMERCIAL_COVERAGE = {
  commercial1: 0.3,
  commercial2: 0.4,
  commercial3: 0.6,
};

// bill 7 grant amounts per affordable unit
export const GRANT = {
  pre_construct: 50000,
  post_construct: 12000,
};

// parking
export const PARKING = {
  parking_ratio: 1.0,
  stall_sqft: 300,
  monthly_rent_per_stall: 100,
  surface_cost_per_sqft: 170,
  structured_cost_per_sqft: 195,
};

// bicycle parking
export const BICYCLE_PARKING = {
  short_term: { ratio: 1 / 10, cost_per_space: 200, sqft_per_space: 10 },
  long_term: { ratio: 1 / 2, cost_per_space: 750, sqft_per_space: 15 },
};

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
// HHFDC AFFORDABLE SALE PRICE TABLES
// =========================================================
// 2025 HHFDC Honolulu County income schedule by family size (median $129,300)
export const INCOME_LIMITS: Record<number, number[]> = {
  10: [10640, 12160, 13680, 15200, 16420, 17640, 18850, 20070],
  20: [21280, 24320, 27360, 30400, 32840, 35280, 37700, 40140],
  30: [31920, 36480, 41040, 45600, 49260, 52920, 56550, 60210],
  40: [42560, 48640, 54720, 60800, 65680, 70560, 75400, 80280],
  50: [53200, 60800, 68400, 76000, 82100, 88200, 94250, 100350],
  60: [63840, 72960, 82080, 91200, 98520, 105840, 113100, 120420],
  70: [74480, 85120, 95760, 106400, 114940, 123480, 131950, 140490],
  80: [85120, 97280, 109440, 121600, 131360, 141120, 150800, 160560],
  90: [95760, 109440, 123120, 136800, 147780, 158760, 169650, 180630],
  100: [106400, 121600, 136800, 152000, 164200, 176400, 188500, 200700],
  110: [117040, 133760, 150480, 167200, 180620, 194040, 207350, 220770],
  120: [127680, 145920, 164160, 182400, 197040, 211680, 226200, 240840],
  130: [138320, 158080, 177840, 197600, 213460, 229320, 245050, 260910],
  140: [148960, 170240, 191520, 212800, 229880, 246960, 263900, 280980],
};

const HHFDC_RATES = [
  0.04, 0.0425, 0.045, 0.0475, 0.05, 0.0525, 0.055, 0.0575, 0.06, 0.0625, 0.065,
  0.0675, 0.07, 0.0725, 0.075,
];

type HhfdcTable = Record<number, Record<string, number>>;

const HHFDC_0BR: HhfdcTable = {
  0.04: {
    ami_50: 273700,
    ami_60: 328400,
    ami_70: 383200,
    ami_80: 437900,
    ami_90: 492700,
    ami_100: 547400,
    ami_110: 602100,
    ami_120: 656900,
    ami_130: 711600,
    ami_140: 766300,
  },
  0.0425: {
    ami_50: 265600,
    ami_60: 318700,
    ami_70: 371900,
    ami_80: 425000,
    ami_90: 478100,
    ami_100: 531200,
    ami_110: 584400,
    ami_120: 637500,
    ami_130: 690600,
    ami_140: 743700,
  },
  0.045: {
    ami_50: 257900,
    ami_60: 309500,
    ami_70: 361000,
    ami_80: 412600,
    ami_90: 464200,
    ami_100: 515800,
    ami_110: 567300,
    ami_120: 618900,
    ami_130: 670500,
    ami_140: 722100,
  },
  0.0475: {
    ami_50: 250500,
    ami_60: 300600,
    ami_70: 350700,
    ami_80: 400800,
    ami_90: 450900,
    ami_100: 501000,
    ami_110: 551100,
    ami_120: 601200,
    ami_130: 651300,
    ami_140: 701400,
  },
  0.05: {
    ami_50: 243400,
    ami_60: 292100,
    ami_70: 340800,
    ami_80: 389500,
    ami_90: 438100,
    ami_100: 486800,
    ami_110: 535500,
    ami_120: 584200,
    ami_130: 632900,
    ami_140: 681500,
  },
  0.0525: {
    ami_50: 236600,
    ami_60: 284000,
    ami_70: 331300,
    ami_80: 378600,
    ami_90: 425900,
    ami_100: 473300,
    ami_110: 520600,
    ami_120: 567900,
    ami_130: 615200,
    ami_140: 662600,
  },
  0.055: {
    ami_50: 230100,
    ami_60: 276200,
    ami_70: 322200,
    ami_80: 368200,
    ami_90: 414200,
    ami_100: 460300,
    ami_110: 506300,
    ami_120: 552300,
    ami_130: 598300,
    ami_140: 644400,
  },
  0.0575: {
    ami_50: 223900,
    ami_60: 268700,
    ami_70: 313500,
    ami_80: 358300,
    ami_90: 403000,
    ami_100: 447800,
    ami_110: 492600,
    ami_120: 537400,
    ami_130: 582200,
    ami_140: 626900,
  },
  0.06: {
    ami_50: 217900,
    ami_60: 261500,
    ami_70: 305100,
    ami_80: 348700,
    ami_90: 392300,
    ami_100: 435900,
    ami_110: 479500,
    ami_120: 523100,
    ami_130: 566600,
    ami_140: 610200,
  },
  0.0625: {
    ami_50: 212200,
    ami_60: 254700,
    ami_70: 297100,
    ami_80: 339500,
    ami_90: 382100,
    ami_100: 424400,
    ami_110: 466900,
    ami_120: 509300,
    ami_130: 551800,
    ami_140: 594200,
  },
  0.065: {
    ami_50: 206700,
    ami_60: 248100,
    ami_70: 289400,
    ami_80: 330800,
    ami_90: 372200,
    ami_100: 413500,
    ami_110: 454800,
    ami_120: 496100,
    ami_130: 537500,
    ami_140: 578800,
  },
  0.0675: {
    ami_50: 201500,
    ami_60: 241800,
    ami_70: 282000,
    ami_80: 322300,
    ami_90: 362700,
    ami_100: 402900,
    ami_110: 443200,
    ami_120: 483500,
    ami_130: 523800,
    ami_140: 564100,
  },
  0.07: {
    ami_50: 196400,
    ami_60: 235700,
    ami_70: 275000,
    ami_80: 314200,
    ami_90: 353600,
    ami_100: 392800,
    ami_110: 432000,
    ami_120: 471400,
    ami_130: 510600,
    ami_140: 549900,
  },
  0.0725: {
    ami_50: 191500,
    ami_60: 229900,
    ami_70: 268200,
    ami_80: 306500,
    ami_90: 344800,
    ami_100: 383100,
    ami_110: 421400,
    ami_120: 459700,
    ami_130: 498000,
    ami_140: 536300,
  },
  0.075: {
    ami_50: 186900,
    ami_60: 224300,
    ami_70: 261600,
    ami_80: 299000,
    ami_90: 336400,
    ami_100: 373800,
    ami_110: 411100,
    ami_120: 448500,
    ami_130: 485900,
    ami_140: 523300,
  },
};

const HHFDC_1BR: HhfdcTable = {
  0.04: {
    ami_50: 312800,
    ami_60: 375400,
    ami_70: 437900,
    ami_80: 500500,
    ami_90: 563000,
    ami_100: 625600,
    ami_110: 688100,
    ami_120: 750700,
    ami_130: 813300,
    ami_140: 875800,
  },
  0.0425: {
    ami_50: 303600,
    ami_60: 364300,
    ami_70: 425000,
    ami_80: 485700,
    ami_90: 546400,
    ami_100: 607100,
    ami_110: 667800,
    ami_120: 728500,
    ami_130: 789300,
    ami_140: 850000,
  },
  0.045: {
    ami_50: 294700,
    ami_60: 353700,
    ami_70: 412600,
    ami_80: 471600,
    ami_90: 530500,
    ami_100: 589500,
    ami_110: 648400,
    ami_120: 707300,
    ami_130: 766300,
    ami_140: 825200,
  },
  0.0475: {
    ami_50: 286300,
    ami_60: 343500,
    ami_70: 400800,
    ami_80: 458000,
    ami_90: 515300,
    ami_100: 572500,
    ami_110: 629800,
    ami_120: 687100,
    ami_130: 744300,
    ami_140: 801600,
  },
  0.05: {
    ami_50: 278200,
    ami_60: 333800,
    ami_70: 389500,
    ami_80: 445100,
    ami_90: 500700,
    ami_100: 556400,
    ami_110: 612000,
    ami_120: 667600,
    ami_130: 723300,
    ami_140: 778900,
  },
  0.0525: {
    ami_50: 270400,
    ami_60: 324500,
    ami_70: 378600,
    ami_80: 432700,
    ami_90: 486800,
    ami_100: 540900,
    ami_110: 594900,
    ami_120: 649000,
    ami_130: 703100,
    ami_140: 757200,
  },
  0.055: {
    ami_50: 263000,
    ami_60: 315600,
    ami_70: 368200,
    ami_80: 420800,
    ami_90: 473400,
    ami_100: 526000,
    ami_110: 578600,
    ami_120: 631200,
    ami_130: 683800,
    ami_140: 736400,
  },
  0.0575: {
    ami_50: 255900,
    ami_60: 307100,
    ami_70: 358300,
    ami_80: 409400,
    ami_90: 460600,
    ami_100: 511800,
    ami_110: 563000,
    ami_120: 614100,
    ami_130: 665300,
    ami_140: 716500,
  },
  0.06: {
    ami_50: 249100,
    ami_60: 298900,
    ami_70: 348700,
    ami_80: 398500,
    ami_90: 448300,
    ami_100: 498200,
    ami_110: 548000,
    ami_120: 597800,
    ami_130: 647600,
    ami_140: 697400,
  },
  0.0625: {
    ami_50: 242500,
    ami_60: 291000,
    ami_70: 339500,
    ami_80: 388100,
    ami_90: 436600,
    ami_100: 485100,
    ami_110: 533600,
    ami_120: 582200,
    ami_130: 630600,
    ami_140: 679100,
  },
  0.065: {
    ami_50: 236300,
    ami_60: 283500,
    ami_70: 330800,
    ami_80: 378000,
    ami_90: 425300,
    ami_100: 472500,
    ami_110: 519800,
    ami_120: 567300,
    ami_130: 614300,
    ami_140: 661500,
  },
  0.0675: {
    ami_50: 230000,
    ami_60: 276300,
    ami_70: 322300,
    ami_80: 368400,
    ami_90: 414400,
    ami_100: 460600,
    ami_110: 506500,
    ami_120: 552900,
    ami_130: 598600,
    ami_140: 644700,
  },
  0.07: {
    ami_50: 224500,
    ami_60: 269400,
    ami_70: 314200,
    ami_80: 359000,
    ami_90: 404000,
    ami_100: 449000,
    ami_110: 493700,
    ami_120: 539000,
    ami_130: 583600,
    ami_140: 628600,
  },
  0.0725: {
    ami_50: 218900,
    ami_60: 262700,
    ami_70: 306500,
    ami_80: 350000,
    ami_90: 394000,
    ami_100: 438100,
    ami_110: 481600,
    ami_120: 525800,
    ami_130: 569200,
    ami_140: 613200,
  },
  0.075: {
    ami_50: 213600,
    ami_60: 256300,
    ami_70: 299000,
    ami_80: 341700,
    ami_90: 384400,
    ami_100: 427000,
    ami_110: 469900,
    ami_120: 512600,
    ami_130: 555300,
    ami_140: 598000,
  },
};

const HHFDC_2BR: HhfdcTable = {
  0.04: {
    ami_50: 351900,
    ami_60: 422300,
    ami_70: 492700,
    ami_80: 563000,
    ami_90: 633400,
    ami_100: 703800,
    ami_110: 774200,
    ami_120: 844500,
    ami_130: 914900,
    ami_140: 985300,
  },
  0.0425: {
    ami_50: 341500,
    ami_60: 409800,
    ami_70: 478100,
    ami_80: 546400,
    ami_90: 614700,
    ami_100: 683000,
    ami_110: 751300,
    ami_120: 819600,
    ami_130: 887900,
    ami_140: 956200,
  },
  0.045: {
    ami_50: 331600,
    ami_60: 397900,
    ami_70: 464200,
    ami_80: 530500,
    ami_90: 596800,
    ami_100: 663100,
    ami_110: 729400,
    ami_120: 795800,
    ami_130: 862100,
    ami_140: 928400,
  },
  0.0475: {
    ami_50: 322100,
    ami_60: 386500,
    ami_70: 450900,
    ami_80: 515300,
    ami_90: 579700,
    ami_100: 644100,
    ami_110: 708500,
    ami_120: 772900,
    ami_130: 837300,
    ami_140: 901800,
  },
  0.05: {
    ami_50: 313000,
    ami_60: 375500,
    ami_70: 438100,
    ami_80: 500700,
    ami_90: 563300,
    ami_100: 625900,
    ami_110: 688500,
    ami_120: 751100,
    ami_130: 813700,
    ami_140: 876300,
  },
  0.0525: {
    ami_50: 304200,
    ami_60: 365100,
    ami_70: 425900,
    ami_80: 486800,
    ami_90: 547600,
    ami_100: 608500,
    ami_110: 669300,
    ami_120: 730200,
    ami_130: 791000,
    ami_140: 851900,
  },
  0.055: {
    ami_50: 295900,
    ami_60: 355100,
    ami_70: 414200,
    ami_80: 473400,
    ami_90: 532600,
    ami_100: 591800,
    ami_110: 650900,
    ami_120: 710100,
    ami_130: 769300,
    ami_140: 828500,
  },
  0.0575: {
    ami_50: 287900,
    ami_60: 345500,
    ami_70: 403000,
    ami_80: 460600,
    ami_90: 518200,
    ami_100: 575800,
    ami_110: 633300,
    ami_120: 690900,
    ami_130: 748500,
    ami_140: 806100,
  },
  0.06: {
    ami_50: 280200,
    ami_60: 336300,
    ami_70: 392300,
    ami_80: 448300,
    ami_90: 504400,
    ami_100: 560400,
    ami_110: 616500,
    ami_120: 672500,
    ami_130: 728500,
    ami_140: 784600,
  },
  0.0625: {
    ami_50: 272900,
    ami_60: 327400,
    ami_70: 382000,
    ami_80: 436600,
    ami_90: 491100,
    ami_100: 545700,
    ami_110: 600300,
    ami_120: 654700,
    ami_130: 709400,
    ami_140: 764000,
  },
  0.065: {
    ami_50: 265800,
    ami_60: 319000,
    ami_70: 372100,
    ami_80: 425300,
    ami_90: 478400,
    ami_100: 531600,
    ami_110: 584700,
    ami_120: 637900,
    ami_130: 691100,
    ami_140: 744200,
  },
  0.0675: {
    ami_50: 259000,
    ami_60: 310800,
    ami_70: 362600,
    ami_80: 414400,
    ami_90: 466200,
    ami_100: 518000,
    ami_110: 569700,
    ami_120: 621600,
    ami_130: 673900,
    ami_140: 725300,
  },
  0.07: {
    ami_50: 252500,
    ami_60: 303000,
    ami_70: 353500,
    ami_80: 404000,
    ami_90: 454500,
    ami_100: 505000,
    ami_110: 555500,
    ami_120: 606000,
    ami_130: 656500,
    ami_140: 707000,
  },
  0.0725: {
    ami_50: 246300,
    ami_60: 295500,
    ami_70: 344800,
    ami_80: 394000,
    ami_90: 443300,
    ami_100: 492500,
    ami_110: 541800,
    ami_120: 591000,
    ami_130: 640300,
    ami_140: 689600,
  },
  0.075: {
    ami_50: 240300,
    ami_60: 288300,
    ami_70: 336400,
    ami_80: 384400,
    ami_90: 432500,
    ami_100: 480500,
    ami_110: 528600,
    ami_120: 576600,
    ami_130: 624700,
    ami_140: 672800,
  },
};

const HHFDC_3BR: HhfdcTable = {
  0.04: {
    ami_50: 391000,
    ami_60: 469200,
    ami_70: 547400,
    ami_80: 625600,
    ami_90: 703800,
    ami_100: 782000,
    ami_110: 860200,
    ami_120: 938400,
    ami_130: 1016600,
    ami_140: 1094800,
  },
  0.0425: {
    ami_50: 379500,
    ami_60: 455300,
    ami_70: 531200,
    ami_80: 607100,
    ami_90: 683000,
    ami_100: 758900,
    ami_110: 834800,
    ami_120: 910700,
    ami_130: 986600,
    ami_140: 1062500,
  },
  0.045: {
    ami_50: 368400,
    ami_60: 442100,
    ami_70: 515800,
    ami_80: 589500,
    ami_90: 663100,
    ami_100: 736800,
    ami_110: 810500,
    ami_120: 884200,
    ami_130: 957900,
    ami_140: 1031500,
  },
  0.0475: {
    ami_50: 357800,
    ami_60: 429400,
    ami_70: 501000,
    ami_80: 572500,
    ami_90: 644100,
    ami_100: 715700,
    ami_110: 787200,
    ami_120: 858800,
    ami_130: 930400,
    ami_140: 1002000,
  },
  0.05: {
    ami_50: 347700,
    ami_60: 417300,
    ami_70: 486800,
    ami_80: 556400,
    ami_90: 625900,
    ami_100: 695500,
    ami_110: 765000,
    ami_120: 834500,
    ami_130: 904100,
    ami_140: 973600,
  },
  0.0525: {
    ami_50: 338000,
    ami_60: 405600,
    ami_70: 473300,
    ami_80: 540900,
    ami_90: 608500,
    ami_100: 676100,
    ami_110: 743700,
    ami_120: 811300,
    ami_130: 878900,
    ami_140: 946500,
  },
  0.055: {
    ami_50: 328800,
    ami_60: 394500,
    ami_70: 460300,
    ami_80: 526000,
    ami_90: 591800,
    ami_100: 657500,
    ami_110: 723300,
    ami_120: 789000,
    ami_130: 854800,
    ami_140: 920500,
  },
  0.0575: {
    ami_50: 319900,
    ami_60: 383800,
    ami_70: 447800,
    ami_80: 511800,
    ami_90: 575800,
    ami_100: 639700,
    ami_110: 703700,
    ami_120: 767700,
    ami_130: 831700,
    ami_140: 895600,
  },
  0.06: {
    ami_50: 311300,
    ami_60: 373600,
    ami_70: 435900,
    ami_80: 498200,
    ami_90: 560400,
    ami_100: 622700,
    ami_110: 685000,
    ami_120: 747200,
    ami_130: 809500,
    ami_140: 871800,
  },
  0.0625: {
    ami_50: 303200,
    ami_60: 363800,
    ami_70: 424400,
    ami_80: 485100,
    ami_90: 545700,
    ami_100: 606300,
    ami_110: 667000,
    ami_120: 727600,
    ami_130: 788200,
    ami_140: 848900,
  },
  0.065: {
    ami_50: 295300,
    ami_60: 354400,
    ami_70: 413500,
    ami_80: 472500,
    ami_90: 531600,
    ami_100: 590700,
    ami_110: 649700,
    ami_120: 708800,
    ami_130: 767800,
    ami_140: 826900,
  },
  0.0675: {
    ami_50: 287800,
    ami_60: 345400,
    ami_70: 402900,
    ami_80: 460500,
    ami_90: 518000,
    ami_100: 575600,
    ami_110: 633200,
    ami_120: 690700,
    ami_130: 748300,
    ami_140: 805800,
  },
  0.07: {
    ami_50: 280600,
    ami_60: 336700,
    ami_70: 392800,
    ami_80: 448900,
    ami_90: 505000,
    ami_100: 561100,
    ami_110: 617300,
    ami_120: 673400,
    ami_130: 729500,
    ami_140: 785600,
  },
  0.0725: {
    ami_50: 273600,
    ami_60: 328400,
    ami_70: 383100,
    ami_80: 437800,
    ami_90: 492500,
    ami_100: 547300,
    ami_110: 602000,
    ami_120: 656700,
    ami_130: 711400,
    ami_140: 766200,
  },
  0.075: {
    ami_50: 267000,
    ami_60: 320400,
    ami_70: 373800,
    ami_80: 427100,
    ami_90: 480500,
    ami_100: 533900,
    ami_110: 587300,
    ami_120: 640700,
    ami_130: 694100,
    ami_140: 747500,
  },
};

const HHFDC_4BR: HhfdcTable = {
  0.04: {
    ami_50: 422400,
    ami_60: 506900,
    ami_70: 591300,
    ami_80: 675800,
    ami_90: 760300,
    ami_100: 844800,
    ami_110: 929200,
    ami_120: 1013700,
    ami_130: 1098200,
    ami_140: 1182700,
  },
  0.0425: {
    ami_50: 409900,
    ami_60: 491900,
    ami_70: 573900,
    ami_80: 655800,
    ami_90: 737800,
    ami_100: 819800,
    ami_110: 901800,
    ami_120: 983800,
    ami_130: 1065800,
    ami_140: 1147700,
  },
  0.045: {
    ami_50: 398000,
    ami_60: 477600,
    ami_70: 557200,
    ami_80: 636800,
    ami_90: 716400,
    ami_100: 796000,
    ami_110: 875500,
    ami_120: 955100,
    ami_130: 1034700,
    ami_140: 1114300,
  },
  0.0475: {
    ami_50: 386600,
    ami_60: 463900,
    ami_70: 541200,
    ami_80: 618500,
    ami_90: 695800,
    ami_100: 773100,
    ami_110: 850400,
    ami_120: 927700,
    ami_130: 1005100,
    ami_140: 1082400,
  },
  0.05: {
    ami_50: 375600,
    ami_60: 450800,
    ami_70: 525900,
    ami_80: 601000,
    ami_90: 676100,
    ami_100: 751300,
    ami_110: 826400,
    ami_120: 901500,
    ami_130: 976700,
    ami_140: 1051800,
  },
  0.0525: {
    ami_50: 365200,
    ami_60: 438200,
    ami_70: 511200,
    ami_80: 584300,
    ami_90: 657300,
    ami_100: 730300,
    ami_110: 803400,
    ami_120: 876400,
    ami_130: 949400,
    ami_140: 1022500,
  },
  0.055: {
    ami_50: 355100,
    ami_60: 426200,
    ami_70: 497200,
    ami_80: 568200,
    ami_90: 639300,
    ami_100: 710300,
    ami_110: 781300,
    ami_120: 852400,
    ami_130: 923400,
    ami_140: 994400,
  },
  0.0575: {
    ami_50: 345500,
    ami_60: 414700,
    ami_70: 483800,
    ami_80: 552900,
    ami_90: 622000,
    ami_100: 691100,
    ami_110: 760200,
    ami_120: 829300,
    ami_130: 898400,
    ami_140: 967500,
  },
  0.06: {
    ami_50: 336300,
    ami_60: 403600,
    ami_70: 470900,
    ami_80: 538100,
    ami_90: 605400,
    ami_100: 672700,
    ami_110: 739900,
    ami_120: 807200,
    ami_130: 874500,
    ami_140: 941700,
  },
  0.0625: {
    ami_50: 327500,
    ami_60: 393000,
    ami_70: 458500,
    ami_80: 524000,
    ami_90: 589500,
    ami_100: 655000,
    ami_110: 720500,
    ami_120: 786000,
    ami_130: 851500,
    ami_140: 917000,
  },
  0.065: {
    ami_50: 319000,
    ami_60: 382800,
    ami_70: 446600,
    ami_80: 510400,
    ami_90: 574300,
    ami_100: 638100,
    ami_110: 701900,
    ami_120: 765700,
    ami_130: 829500,
    ami_140: 893300,
  },
  0.0675: {
    ami_50: 310900,
    ami_60: 373100,
    ami_70: 435300,
    ami_80: 497400,
    ami_90: 559600,
    ami_100: 621800,
    ami_110: 684000,
    ami_120: 746200,
    ami_130: 808300,
    ami_140: 870500,
  },
  0.07: {
    ami_50: 303100,
    ami_60: 363700,
    ami_70: 424300,
    ami_80: 485000,
    ami_90: 545600,
    ami_100: 606200,
    ami_110: 666800,
    ami_120: 727400,
    ami_130: 788000,
    ami_140: 848700,
  },
  0.0725: {
    ami_50: 295600,
    ami_60: 354700,
    ami_70: 413800,
    ami_80: 473000,
    ami_90: 532100,
    ami_100: 591200,
    ami_110: 650300,
    ami_120: 709400,
    ami_130: 768600,
    ami_140: 827700,
  },
  0.075: {
    ami_50: 288400,
    ami_60: 346100,
    ami_70: 403800,
    ami_80: 461400,
    ami_90: 519100,
    ami_100: 576800,
    ami_110: 634500,
    ami_120: 692100,
    ami_130: 749800,
    ami_140: 807500,
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
  market_ami?: string;
  construction_rate?: number;
  equity?: number;
  grant_type?: "none" | "pre_construct" | "post_construct";
  grant_amount?: number;
  land_cost?: number;
  permanent_rate?: number;
  hold_years?: number;
  amort_years?: number;
  leaseup_months?: number;
  min_dscr?: number;
  include_retail?: boolean;
  retail_rent?: number;
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
  buildable_sqft: number;
  net_residential_sqft: number;
  net_commercial_sqft: number;
  max_units: number;
  parking_stalls: number;
  affordable_units: number;
  afd_rent_units: number;
  mkt_rent_units: number;
  afd_sale_units: number;
  mkt_sale_units: number;
  hard_cost: number;
  soft_cost: number;
  dev_cost: number;
  total_financing_cost: number;
  // financing cost of the construction-only loan that RLV is computed on;
  // total_financing_cost above is the deal loan, sized with land in the base
  rlv_financing_cost: number;
  pre_construction_subsidy: number;
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
  rlv_post_grant: number;
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
};

// soft cost line items (shared across all pathways)
export type SoftCostBreakdown = {
  environmental: number;
  building_permit: number;
  plan_review: number;
  wastewater: number;
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
  // the open-space bonus (3.5 / 3.5 / 7.5 under § 21-3.120-2(c)) is not modeled
  if (zone_class === "B-2" || zone_class === "BMX-3") return 2.5;
  if (zone_class === "BMX-4") return 4.0;
  return 0;
}

// calculate FAR based on bill 6 ordinanace (ONLY USE FOR BILL 6 PATH)
export function calcFarBill6(zone_class: string): number {
  if (ZONE_GROUPS.lowDensity.includes(zone_class)) return 2.0;
  if (zone_class === "A-2" || zone_class === "AMX-2" || zone_class === "B-2")
    return 3.0;
  if (
    zone_class === "A-3" ||
    zone_class === "AMX-3" ||
    zone_class === "BMX-3" ||
    zone_class === "BMX-4" ||
    ZONE_GROUPS.waikiki.includes(zone_class)
  )
    return 4.0;
  return 0;
}

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

// construction months by zone class
export function constructionMonthsByZone(zone_class: string): number {
  if (
    zone_class === "R-5" ||
    zone_class === "A-1" ||
    zone_class === "AMX-1" ||
    zone_class === "low_rise"
  )
    return 18;
  if (
    zone_class === "A-2" ||
    zone_class === "AMX-2" ||
    zone_class === "B-2" ||
    zone_class === "BMX-2" ||
    zone_class === "mid_rise"
  )
    return 24;
  if (
    zone_class === "A-3" ||
    zone_class === "AMX-3" ||
    zone_class === "BMX-3" ||
    zone_class === "BMX-4" ||
    ZONE_GROUPS.waikiki.includes(zone_class)
  )
    return 36;
  return 18;
}

// user override if provided, else the existing zone-based lookup
export function resolveConstMonths(
  zone_class: string,
  override?: number
): number {
  if (override != null && override > 0) return override;
  return constructionMonthsByZone(zone_class);
}

// permitting months by zone class
export function permittingMonthsByZone(zone_class: string): number {
  if (
    zone_class === "A-1" ||
    zone_class === "AMX-1" ||
    zone_class === "low_rise"
  )
    return Math.round(425 / 30);
  if (
    zone_class === "A-2" ||
    zone_class === "AMX-2" ||
    zone_class === "A-3" ||
    zone_class === "AMX-3" ||
    ZONE_GROUPS.waikiki.includes(zone_class) ||
    zone_class === "mid_rise"
  )
    return Math.round(535 / 30);
  if (
    zone_class === "B-2" ||
    zone_class === "BMX-2" ||
    zone_class === "BMX-3" ||
    zone_class === "BMX-4"
  )
    return Math.round(454 / 30);
  if (zone_class === "R-5") return Math.round(353 / 30);
  return 14;
}

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

// excavation depth by zone class
export function excavationDepthByZone(zone_class: string): number {
  if (ZONE_GROUPS.lowDensity.includes(zone_class)) return 3;
  if (
    zone_class === "A-2" ||
    zone_class === "AMX-2" ||
    zone_class === "B-2" ||
    zone_class === "BMX-2"
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

// parking: calculate required stalls
export function parkingRequiredSpaces(buildable_sqft: number): number {
  return Math.floor((buildable_sqft / 1000) * PARKING.parking_ratio);
}

// parking: calculate surface parking cost
export function calcSurfaceParkingCost(buildable_sqft: number): number {
  const stalls = parkingRequiredSpaces(buildable_sqft);
  const total_area = stalls * PARKING.stall_sqft;
  return PARKING.surface_cost_per_sqft * total_area;
}

// parking: calculate annual parking income
export function calcParkingIncome(buildable_sqft: number): number {
  const stalls = parkingRequiredSpaces(buildable_sqft);
  return stalls * PARKING.monthly_rent_per_stall * 12;
}

// bicycle parking: calculate total cost
export function calcBicycleParkingCost(num_units: number): number {
  const st_spaces = Math.round(num_units * BICYCLE_PARKING.short_term.ratio);
  const lt_spaces = Math.round(num_units * BICYCLE_PARKING.long_term.ratio);
  return (
    st_spaces * BICYCLE_PARKING.short_term.cost_per_space +
    lt_spaces * BICYCLE_PARKING.long_term.cost_per_space
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
  affordable_units: number,
  grant_type: string,
  lot_sqft: number,
  total_months: number,
  land_rate: number = DEFAULT_TARGET_RETURN,
  profit_margin: number = DEFAULT_PROFIT_MARGIN,
  grant_amount: number = GRANT.post_construct
): {
  selling_costs: number;
  post_construction_grant: number;
  pre_construction_subsidy: number;
  profit: number;
  project_cost: number;
  land_carry: number;
  rlv: number;
  rlv_sqft: number;
} {
  const selling_costs = gdv * FINANCING.disposition_cost;

  const post_construction_grant =
    grant_type === "post_construct" ? affordable_units * grant_amount : 0;

  // pre-construction subsidy is cash at t=0, so it is added after the land
  // carry rather than inside the residual (which is a stabilization-date figure)
  const pre_construction_subsidy =
    grant_type === "pre_construct" ? affordable_units * grant_amount : 0;

  const project_cost = dev_cost + total_financing_cost;
  const profit = project_cost * profit_margin;

  const residual =
    gdv - selling_costs + post_construction_grant - project_cost - profit;

  // land carry: only the land is paid at t=0
  const land_carry = (1 + land_rate) ** (total_months / 12);
  const rlv = residual / land_carry + pre_construction_subsidy;
  const rlv_sqft = rlv / lot_sqft;

  return {
    selling_costs: Math.round(selling_costs),
    post_construction_grant,
    pre_construction_subsidy,
    profit: Math.round(profit),
    project_cost: Math.round(project_cost),
    land_carry: Math.round(land_carry * 10000) / 10000,
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
  take_out: number | null,
  closing_grant: number = 0
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
  const equity_amount = Math.max(
    0,
    amount_to_finance - loan_principal - closing_grant
  );
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
    // is different by the 16th decimal place, so use a small threshold
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
    rlv_post_grant: 0,
    rlv_profit: 0,
    rlv_project_cost: 0,
    rlv: 0,
    rlv_sqft: 0,
    dev_roi: 0,
  };
}
