// Real parcels: turning a parcel's physical envelope into model inputs.
//
// The model (calcSingle) takes one flat set of inputs. For a real parcel, the
// lot size and zone come from the parcel, but its height limit and FAR depend
// on the pathway: Bill 6 has its own FAR schedule, Bill 7 caps height at 60 ft
// and sets FAR 4.0, TOD doubles the zone FAR, and a parcel with no recorded
// height gets the pathway's default. These rules used to live in the Policy
// Gauge (and, for FAR, again in the Development Calculator); here they are
// written once so every user of the model applies them the same way.

import {
  BILL6_DEFAULT_HEIGHT_LIMIT,
  DEFAULT_HEIGHT_LIMIT as BILL7_DEFAULT_HEIGHT_LIMIT,
  H201_DEFAULT_HEIGHT_LIMIT,
  STD_DEFAULT_HEIGHT_LIMIT,
  TOD_DEFAULT_HEIGHT_LIMIT,
  calcSingle,
  type ParcelOutput,
  type ProgramId,
  type SliderInputs,
} from "./calculations";
import { calcFAR, calcFarBill6 } from "./calculations/calc-shared";

/** Bill 7 caps the building envelope at this height, whatever the zoning. */
export const BILL7_MAX_HEIGHT = 60;
/** Bill 7's statutory FAR. */
export const BILL7_FAR = 4.0;
/** TOD multiplies the zone's FAR by this bonus. */
export const TOD_FAR_BONUS = 2;

/** A real parcel's physical envelope. */
export interface Parcel {
  /** Tax map key; copied onto the output when given. */
  tmk?: string;
  /** Lot area, sqft. */
  lot_sqft: number;
  /** Zoning district, e.g. "A-2", "BMX-3", "Apart" (Waikīkī Apartment Precinct). */
  zone_class: string;
  /** Zoned height limit, ft. 0 or less means unknown: the pathway default is used. */
  height: number;
}

/** A pathway's own height limit and FAR for a parcel. */
export interface Envelope {
  /** ft */
  height_limit: number;
  max_far: number;
}

// height used when a parcel has no recorded height
const DEFAULT_HEIGHT: Record<ProgramId, number> = {
  bill6: BILL6_DEFAULT_HEIGHT_LIMIT,
  bill7: BILL7_DEFAULT_HEIGHT_LIMIT,
  standard: STD_DEFAULT_HEIGHT_LIMIT,
  tod: TOD_DEFAULT_HEIGHT_LIMIT,
  h201: H201_DEFAULT_HEIGHT_LIMIT,
};

/**
 * The height limit and FAR a pathway gives a parcel, before any override.
 * This is what a parcel builds to while the height and FAR levers are left
 * alone.
 */
export function pathwayEnvelope(program: ProgramId, parcel: Parcel): Envelope {
  const height = parcel.height > 0 ? parcel.height : DEFAULT_HEIGHT[program];
  switch (program) {
    case "bill6":
      // Bill 6 has its own FAR schedule, not the base zone lookup
      return { height_limit: height, max_far: calcFarBill6(parcel.zone_class) };
    case "bill7":
      return {
        height_limit: Math.min(height, BILL7_MAX_HEIGHT),
        max_far: BILL7_FAR,
      };
    case "tod":
      return {
        height_limit: height,
        max_far:
          calcFAR(parcel.zone_class, parcel.lot_sqft) * TOD_FAR_BONUS,
      };
    case "standard":
    case "h201":
    default:
      return {
        height_limit: height,
        max_far: calcFAR(parcel.zone_class, parcel.lot_sqft),
      };
  }
}

/**
 * Each pathway's default assumptions: everything except the envelope (lot
 * size, zone, height limit, FAR), which comes from the parcel.
 *
 * `cap_rate` is deliberately absent: left out, the model uses the parcel's
 * zone cap rate. Pass one to apply a single rate instead.
 */
export const DEFAULT_INPUTS: Record<ProgramId, SliderInputs> = (() => {
  const standard: SliderInputs = {
    program: "standard",
    unit_type: "one_bb_100",
    affordable_ami: "ami_80",
    market_ami: "ami_120",
    include_retail: false,
    retail_rent: 5,
    hard_cost_per_sqft: 450,
    land_cost: 200,
    opex_ratio: 0.24,
    waivable_fee_basis: "market_units",
    park: "in_lieu",
    setback: 10,
    permitting_months: 18,
    const_months: 12,
    leaseup_months: 6,
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
    tod: { ...standard, program: "tod", floor_height: 10 },
    h201: {
      ...standard,
      program: "h201",
      affordable_ami: "ami_120",
      market_ami: "ami_140",
      affordability: 0.51,
      hard_cost_per_sqft: 550,
    },
    bill7: {
      program: "bill7",
      unit_type: "studio50_1br50",
      affordable_ami: "ami_80",
      market_ami: "ami_100",
      include_retail: false,
      retail_rent: 3,
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
      permitting_months: 18,
      const_months: 12,
      leaseup_months: 6,
      equity: 0.3,
      permanent_rate: 0.07,
      hold_years: 10,
      amort_years: 30,
      min_dscr: 1.2,
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
 * Levers set to `undefined` count as not set.
 */
export function parcelInputs(
  program: ProgramId,
  parcel: Parcel,
  levers: Partial<SliderInputs> = {}
): SliderInputs {
  const set = Object.fromEntries(
    Object.entries(levers).filter(([, value]) => value !== undefined)
  ) as Partial<SliderInputs>;
  const envelope = pathwayEnvelope(program, parcel);
  const height = set.height_limit ?? envelope.height_limit;
  return {
    ...DEFAULT_INPUTS[program],
    ...set,
    program,
    lot_sqft: parcel.lot_sqft,
    zone_class: parcel.zone_class,
    height_limit:
      program === "bill7" ? Math.min(height, BILL7_MAX_HEIGHT) : height,
    max_far: set.max_far ?? envelope.max_far,
  };
}

/**
 * One real parcel's pro forma under a pathway:
 * `calcSingle(parcelInputs(program, parcel, levers))`, with the parcel's TMK
 * on the output when it has one.
 */
export function calcParcel(
  program: ProgramId,
  parcel: Parcel,
  levers: Partial<SliderInputs> = {}
): ParcelOutput {
  const output = calcSingle(parcelInputs(program, parcel, levers));
  return parcel.tmk === undefined ? output : { ...output, tmk: parcel.tmk };
}
