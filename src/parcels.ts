// Real parcels: turning a parcel's physical envelope into model inputs.
//
// The model (calcSingle) takes one flat set of inputs. For a real parcel, the
// lot size and zone come from the parcel, but its height limit and FAR depend
// on the pathway: Bill 6 has its own FAR schedule, Bill 7 caps height at 60 ft
// and sets FAR 4.0, TOD applies the PD-T / IPD-T rules of § 21-9.100-5, -8
// and -10, Standard, Before Ord. 26-7 and 201H add the open-space bonus, and a
// parcel with no recorded height gets the pathway's default (TOD excepted:
// those parcels are reported as not modeled). These rules used to live in the
// Policy Gauge (and, for FAR, again in the Development Calculator); here they
// are written once so every user of the model applies them the same way.

import {
  BILL6_DEFAULT_HEIGHT_LIMIT,
  DEFAULT_HEIGHT_LIMIT as BILL7_DEFAULT_HEIGHT_LIMIT,
  H201_DEFAULT_HEIGHT_LIMIT,
  STD_DEFAULT_HEIGHT_LIMIT,
  calcSingle,
  type ParcelOutput,
  type ProgramId,
  type SliderInputs,
} from "./calculations";
import {
  baseFar,
  calcFAR,
  calcFarBill6,
  calcFarPdt,
  calcFarTod,
  IMX1_PDT_MAX_UNITS,
  openSpaceBonus,
  openSpaceBonusOver,
  residentialUse,
  todHeightLimit,
  todHeightPdt,
  todPlanCeiling,
  TOD_ELIGIBLE_DISTRICTS,
  TOD_MIN_LOT_SQFT,
} from "./calculations/calc-shared";

/** Bill 7 caps the building envelope at this height, whatever the zoning. */
export const BILL7_MAX_HEIGHT = 60;
/** Bill 7's statutory FAR. */
export const BILL7_FAR = 4.0;

/** A real parcel's physical envelope. */
export interface Parcel {
  /** Tax map key; copied onto the output when given. */
  tmk?: string;
  /** Lot area, sqft. */
  lot_sqft: number;
  /** Zoning district, e.g. "A-2", "BMX-3", "Apart" (Waikīkī Apartment Precinct). */
  zone_class: string;
  /**
   * Zoned height limit, ft. 0 or less means unknown: the pathway default is
   * used, except under TOD, where the parcel is reported as not modeled.
   */
  height: number;

  // ── TOD pathway only ───────────────────────────────────────────────────
  /** PD-T inside an adopted TOD special district (Waipahu, Aiea-Pearl City,
   *  Halawa, and East Kapolei lots with a parenthetical height), IPD-T in the
   *  other station areas; absent = no transit permit available */
  tod_regime?: "pdt" | "ipdt";
  /** entirely within the state land use urban district, § 21-9.100-5(b)(4) */
  slu_urban?: boolean;
  /** PD-T only: parenthetical bonus height from the TOD zoning map, ft */
  tod_map_bonus_height?: number;
  /** station area, a key into TOD_PLAN_STANDARDS */
  station_area?: string;
  /** "core" = TOD Precinct (<= 1/4 mi); "tiz" = 1/4 to 1/2 mi */
  tod_precinct?: "core" | "tiz";
}

/** A pathway's own height limit and FAR for a parcel. */
export interface Envelope {
  /** ft */
  height_limit: number;
  max_far: number;
  /** TOD: where the FAR and height came from (they can differ in source) */
  far_source?: "base" | "ipdt_formula" | "plan_ceiling" | "pdt_ladder";
  height_source?:
    | "base"
    | "ipdt_doubling"
    | "plan_cap"
    | "pdt_minor_sd"
    | "pdt_major_sd"
    | "pdt_map_bonus";
  /**
   * TOD: whether the parcel can use the transit permit. "not_modeled" means
   * the governing rules are not loaded for it, and "not_applicable" that
   * housing is not permitted at this tier: leave both out of totals rather
   * than counting them as infeasible.
   */
  status?: "eligible" | "ineligible" | "not_modeled" | "not_applicable";
  status_reason?: string;
  /** a legal cap on dwelling units (TOD: IMX-1 under PD-T) */
  max_units?: number;
  /** FAR earned by public open space; its ground is given up at 5:1 */
  open_space_bonus?: number;
}

/** Permit tiers, least to most. Minor and major special district permits
 *  exist only inside the TOD special districts (PD-T); IPD-T treats them as
 *  base. "with_benefits" is PD-T or IPD-T approval. Every tier above base is a
 *  ceiling: the benefits that buy it are not priced. */
export type TodTier = "base" | "minor_sd" | "major_sd" | "with_benefits";

export interface TodEnvelopeOpts {
  tier?: TodTier;
  /** § 21-3.120-2(b) bonus, in FAR. IPD-T only. */
  density_bonus?: number;
  /** TOD zoning map parenthetical, PD-T only */
  map_bonus_height?: number;
  /** PD-T approval with no parenthetical on the map: the major permit height
   *  (generous) instead of the zoned height (strict, § 21-9.100-10(c)(2)) */
  generous_height?: boolean;
}

const INDUSTRIAL_ZONES = ["I-1", "I-2", "I-3", "IMX-1"];

/** null when the parcel clears every § 21-9.100-5(b) gate */
export function todIneligibleReason(parcel: Parcel): string | null {
  if (!parcel.tod_regime) return "outside every TOD special district boundary";
  if (!TOD_ELIGIBLE_DISTRICTS.includes(parcel.zone_class))
    return `zone ${parcel.zone_class} is not an eligible district`;
  if (parcel.lot_sqft < TOD_MIN_LOT_SQFT)
    return "below the 20,000 sqft minimum project size";
  if (parcel.slu_urban === false)
    return "not entirely within the state land use urban district";
  return null;
}

/** null unless housing is not permitted in the zone at this tier */
export function todNotApplicableReason(
  parcel: Parcel,
  tier: TodTier
): string | null {
  if (!parcel.tod_regime || !INDUSTRIAL_ZONES.includes(parcel.zone_class))
    return null;
  if (residentialUse(parcel.zone_class, parcel.tod_regime) === "not_permitted")
    return `multi-unit dwelling is not permitted in ${parcel.zone_class} under PD-T`;
  // IPD-T has no special district permits: anything short of approval is base
  if (parcel.tod_regime === "pdt" ? tier !== "base" : tier === "with_benefits")
    return null;
  // Table 21-9.8: housing in IMX-1 needs a minor special district permit
  if (parcel.tod_regime === "pdt")
    return "IMX-1: housing needs a minor special district permit (Table 21-9.8)";
  return `housing in ${parcel.zone_class} needs IPD-T approval`;
}

function todEnvelope(
  parcel: Parcel,
  opts: TodEnvelopeOpts = {}
): Envelope {
  const tier = opts.tier ?? "base";
  const base_height = parcel.height;

  if (!(base_height > 0)) {
    return {
      height_limit: 0,
      max_far: baseFar(parcel.zone_class, parcel.lot_sqft),
      far_source: "base",
      height_source: "base",
      status: "not_modeled",
      status_reason: "no height limit in the parcel data",
    };
  }

  const not_applicable = todNotApplicableReason(parcel, tier);
  if (not_applicable) {
    return {
      height_limit: base_height,
      max_far: baseFar(parcel.zone_class, parcel.lot_sqft),
      far_source: "base",
      height_source: "base",
      status: "not_applicable",
      status_reason: not_applicable,
      max_units: 0,
    };
  }

  // § 21-9.100-10(a)(1): the 20,000 sqft minimum is for PD-T approval; minor
  // and major special district permits have none
  const sd_permit =
    parcel.tod_regime === "pdt" && (tier === "minor_sd" || tier === "major_sd");
  const reason = todIneligibleReason(
    sd_permit
      ? { ...parcel, lot_sqft: Math.max(parcel.lot_sqft, TOD_MIN_LOT_SQFT) }
      : parcel
  );
  if (reason) {
    return {
      height_limit: base_height,
      max_far: baseFar(parcel.zone_class, parcel.lot_sqft),
      far_source: "base",
      height_source: "base",
      status: "ineligible",
      status_reason: reason,
    };
  }

  if (parcel.tod_regime === "pdt") {
    const map_bonus = opts.map_bonus_height ?? parcel.tod_map_bonus_height;
    const imx1 = parcel.zone_class === "IMX-1";
    // by right: the underlying zoning, with no open-space bonus inside a TOD
    // special district (§ 21-9.100-8(a)(1)(B))
    if (tier === "base") {
      return {
        height_limit: base_height,
        max_far: baseFar(parcel.zone_class, parcel.lot_sqft),
        far_source: "base",
        height_source: "base",
        status: "eligible",
      };
    }
    // minor or major special district permit, or PD-T approval
    // (§ 21-9.100-8(a)(1)(A), (D); § 21-9.100-10)
    const route = tier === "with_benefits" ? "pdt" : tier;
    const strict_no_bonus =
      route === "pdt" && map_bonus == null && !opts.generous_height;
    return {
      height_limit: strict_no_bonus
        ? base_height
        : todHeightPdt(base_height, route, map_bonus),
      max_far: calcFarPdt(parcel.zone_class, parcel.lot_sqft, route),
      far_source: "pdt_ladder",
      height_source: strict_no_bonus
        ? "base"
        : tier === "minor_sd"
          ? "pdt_minor_sd"
          : tier === "major_sd" || map_bonus == null
            ? "pdt_major_sd"
            : "pdt_map_bonus",
      status: "eligible",
      // § 21-9.100-7(c)
      ...(imx1 && {
        max_units: IMX1_PDT_MAX_UNITS,
        status_reason: `IMX-1 under PD-T: up to ${IMX1_PDT_MAX_UNITS} units above the ground floor, with a special district permit`,
      }),
    };
  }

  // IPD-T: every bonus needs community benefits (§ 21-9.100-5(g)(1)), so the
  // base tier is the underlying zoning, with the district's open-space bonus.
  // Special district permits don't exist outside the TOD special districts.
  if (tier !== "with_benefits") {
    const zoning_bonus =
      opts.density_bonus ?? openSpaceBonus(parcel.zone_class);
    return {
      height_limit: base_height,
      max_far: baseFar(parcel.zone_class, parcel.lot_sqft) + zoning_bonus,
      far_source: "base",
      height_source: "base",
      status: "eligible",
      open_space_bonus: zoning_bonus,
    };
  }

  const plan = todPlanCeiling(
    parcel.station_area ?? null,
    parcel.tod_precinct ?? "tiz"
  );
  const bonus = opts.density_bonus ?? openSpaceBonus(parcel.zone_class);
  const formula_far = calcFarTod(parcel.zone_class, parcel.lot_sqft, bonus);
  // a station-area plan's FAR replaces the formula where it is higher, and
  // then the open-space bonus (and its plaza) is not needed
  const plan_far = plan.far != null && plan.far > formula_far ? plan.far : null;

  // § 21-9.100-5(e)(2): a plan's height, or twice the zoned height up to
  // 450 ft where no plan height is known; a higher zoned height prevails
  const published = parcel.tod_map_bonus_height ?? plan.height;
  const height_limit = todHeightLimit(
    parcel.zone_class,
    parcel.lot_sqft,
    base_height,
    published ?? undefined
  );

  return {
    height_limit,
    max_far: plan_far ?? formula_far,
    far_source: plan_far != null ? "plan_ceiling" : "ipdt_formula",
    height_source: published != null ? "plan_cap" : "ipdt_doubling",
    status: "eligible",
    open_space_bonus: plan_far != null ? 0 : bonus,
  };
}

// height used when a parcel has no recorded height (not TOD: see todEnvelope)
const DEFAULT_HEIGHT: Record<Exclude<ProgramId, "tod">, number> = {
  bill6: BILL6_DEFAULT_HEIGHT_LIMIT,
  bill7: BILL7_DEFAULT_HEIGHT_LIMIT,
  standard: STD_DEFAULT_HEIGHT_LIMIT,
  h201: H201_DEFAULT_HEIGHT_LIMIT,
};

/**
 * The height limit and FAR a pathway gives a parcel, before any override.
 * This is what a parcel builds to while the height and FAR levers are left
 * alone. `opts` applies to TOD only.
 */
export function pathwayEnvelope(
  program: ProgramId,
  parcel: Parcel,
  opts: TodEnvelopeOpts = {}
): Envelope {
  if (program === "tod") return todEnvelope(parcel, opts);
  const height = parcel.height > 0 ? parcel.height : DEFAULT_HEIGHT[program];
  switch (program) {
    case "bill6":
      // Bill 6 has its own FAR schedule, not the base zone lookup
      return withOpenSpaceBonus(
        parcel.zone_class,
        height,
        calcFarBill6(parcel.zone_class)
      );
    case "bill7":
      return {
        height_limit: Math.min(height, BILL7_MAX_HEIGHT),
        max_far: BILL7_FAR,
      };
    case "standard":
    case "h201":
    default:
      return withOpenSpaceBonus(
        parcel.zone_class,
        height,
        calcFAR(parcel.zone_class, parcel.lot_sqft)
      );
  }
}

// the district's open-space bonus (§ 21-3.120-2(c)) on top of a pathway's own
// FAR, earned with public open space
function withOpenSpaceBonus(
  zone_class: string,
  height_limit: number,
  far: number
): Envelope {
  const bonus = openSpaceBonusOver(zone_class, far);
  return { height_limit, max_far: far + bonus, open_space_bonus: bonus };
}

/** Ground the TOD open-space bonus consumes, at 5:1, sqft. A number is the
 *  IPD-T density bonus; otherwise the TOD envelope options. */
export function todOpenSpaceCostSqft(
  parcel: Parcel,
  opts: TodEnvelopeOpts | number = {}
): number {
  const o = typeof opts === "number" ? { density_bonus: opts } : opts;
  return ((todEnvelope(parcel, o).open_space_bonus ?? 0) * parcel.lot_sqft) / 5;
}

/**
 * Each pathway's default assumptions: everything except the envelope (lot
 * size, zone, height limit, FAR), which comes from the parcel.
 *
 * `cap_rate` is deliberately absent: left out, the model uses its flat
 * default (5.1%). Pass one to apply a different rate.
 */
export const DEFAULT_INPUTS: Record<ProgramId, SliderInputs> = (() => {
  const standard: SliderInputs = {
    program: "standard",
    unit_type: "one_bb_100",
    affordable_ami: "ami_80",
    market_ami: "ami_120",
    include_retail: false,
    retail_rent: 5,
    retail_share: 0.1,
    hard_cost_per_sqft: 450,
    land_cost: 200,
    opex_ratio: 0.3,
    waivable_fee_basis: "market_units",
    park: "in_lieu",
    setback: 10,
    parking_ratio: 0.5,
    permitting_months: 18,
    const_months: 12,
    leaseup_months: 9,
    equity: 0.3,
    permanent_rate: 0.0675,
    hold_years: 8,
    amort_years: 30,
    min_dscr: 1.2,
    target_return: 0.115,
    // 100% rental; for-sale is deferred to Chapter 29
    rental_split: 1,
    sale_split: 0,
  };
  return {
    standard,
    bill6: { ...standard, program: "bill6" },
    tod: { ...standard, program: "tod", floor_height: 10, parking_ratio: 0 },
    h201: {
      ...standard,
      program: "h201",
      parking_ratio: 0,
      affordable_ami: "ami_120",
      market_ami: "ami_140",
      affordability: 0.51,
      hard_cost_per_sqft: 550,
      // 201H projects are GET-exempt, so opex matches Bill 7
      opex_ratio: 0.19,
    },
    bill7: {
      program: "bill7",
      unit_type: "studio50_1br50",
      affordable_ami: "ami_80",
      market_ami: "ami_100",
      include_retail: false,
      retail_rent: 3,
      retail_share: 0.1,
      building_area_per_unit: 800,
      grant_type: "post_construct",
      grant_amount: 12000,
      hard_cost_per_sqft: 450,
      land_cost: 200,
      opex_ratio: 0.19,
      // Bill 7 waives the city fees and park dedication (ROH 43-10.8)
      waivable_fee_basis: "none",
      park: "exempt",
      setback: 10,
      parking_ratio: 0,
      permitting_months: 18,
      const_months: 12,
      leaseup_months: 9,
      equity: 0.3,
      permanent_rate: 0.07,
      hold_years: 10,
      amort_years: 30,
      min_dscr: 1.15,
      target_return: 0.115,
    },
  };
})();

/**
 * Model inputs for a real parcel under a pathway: the pathway's default
 * assumptions, then any `levers` the caller sets, then the parcel's envelope.
 *
 * `levers.height_limit` and `levers.max_far` override the pathway's envelope
 * for this parcel (a lever applied to many parcels applies one value to all).
 * Bill 7's height cap still applies: 30 ft builds to 30 ft, 75 ft to 60 ft.
 * The open-space bonus and, under TOD, the unit cap follow the parcel's
 * envelope, as in the gauge. Levers set to
 * `undefined` count as not set. `opts` applies to TOD only.
 */
export function parcelInputs(
  program: ProgramId,
  parcel: Parcel,
  levers: Partial<SliderInputs> = {},
  opts: TodEnvelopeOpts = {}
): SliderInputs {
  const set = Object.fromEntries(
    Object.entries(levers).filter(([, value]) => value !== undefined)
  ) as Partial<SliderInputs>;
  const envelope = pathwayEnvelope(program, parcel, opts);
  const height = set.height_limit ?? envelope.height_limit;
  const inputs: SliderInputs = {
    ...DEFAULT_INPUTS[program],
    ...set,
    program,
    lot_sqft: parcel.lot_sqft,
    zone_class: parcel.zone_class,
    height_limit:
      program === "bill7" ? Math.min(height, BILL7_MAX_HEIGHT) : height,
    max_far: set.max_far ?? envelope.max_far,
  };
  if (program === "tod") {
    inputs.max_units = envelope.max_units;
    inputs.open_space_bonus = envelope.open_space_bonus ?? 0;
  } else if (envelope.open_space_bonus !== undefined) {
    inputs.open_space_bonus = envelope.open_space_bonus;
  }
  return inputs;
}

/**
 * One real parcel's pro forma under a pathway:
 * `calcSingle(parcelInputs(program, parcel, levers, opts))`, with the
 * parcel's TMK on the output when it has one. `opts` applies to TOD only.
 */
export function calcParcel(
  program: ProgramId,
  parcel: Parcel,
  levers: Partial<SliderInputs> = {},
  opts: TodEnvelopeOpts = {}
): ParcelOutput {
  const output = calcSingle(parcelInputs(program, parcel, levers, opts));
  return parcel.tmk === undefined ? output : { ...output, tmk: parcel.tmk };
}
