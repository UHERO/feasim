// Calculator (Project View) tests: calcSingle on the inputs the calculator
// builds at each pathway's slider defaults, with retail on and off, and under
// TOD for each regime and tier.
//
// The inputs (test/data/calculator-defaults.json) are generated from the
// calculator's own slider code; see its `_source`.

import { describe, expect, it } from "vitest";

import {
  BILL7_FAR,
  calcSingle,
  legalParkingRatio,
  overallLevel,
  pathwayEnvelope,
  permitsGroundFloorRetail,
  PDT_FRONT_NO_PARKING_FT,
  roundHalfUp,
  type Parcel,
  type ProgramId,
  type SliderInputs,
} from "../src";
import inputs from "./data/calculator-defaults.json";

const { _source, ...CASES } = inputs as unknown as Record<string, SliderInputs>;
const cases = Object.entries(CASES);
const casesOf = (program: ProgramId) => cases.filter(([, inputs]) => inputs.program === program);

// TOD cases: the regime and tier the calculator's toggles were set to
const TOD_CASES = {
  "tod IPD-T tier 0": { regime: "ipdt", tier: "base" },
  "tod IPD-T tier 3": { regime: "ipdt", tier: "with_benefits" },
  "tod PD-T tier 0": { regime: "pdt", tier: "base" },
  "tod PD-T tier 1": { regime: "pdt", tier: "minor_sd" },
  "tod PD-T tier 2": { regime: "pdt", tier: "major_sd" },
  "tod PD-T tier 3": { regime: "pdt", tier: "with_benefits" },
} as const;

// round to 10 significant digits: floating-point math can differ in the last
// digit across node versions
function rounded(value: unknown): unknown {
  if (typeof value === "number")
    return Number.isFinite(value) ? Number(value.toPrecision(10)) : value;
  if (Array.isArray(value)) return value.map(rounded);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, rounded(v)]));
  return value;
}

describe("calculator defaults", () => {
  it("covers every pathway with retail on and off", () => {
    for (const program of ["bill6", "bill7", "standard", "tod", "h201"] as const) {
      expect(CASES[program]?.include_retail, program).toBe(false);
      expect(CASES[`${program} with retail`]?.include_retail, program).toBe(true);
    }
  });

  it.each(cases)("%s matches the snapshot", (_name, inputs) => {
    const output = calcSingle(inputs);
    expect(rounded({ level: overallLevel(output), output })).toMatchSnapshot();
  });

  it.each(cases)("%s returns whole, consistent unit counts", (name, inputs) => {
    const r = calcSingle(inputs);
    expect(Number.isInteger(r.max_units), name).toBe(true);
    expect(r.max_units, name).toBeGreaterThanOrEqual(0);
    expect(r.affordable_units, name).toBeLessThanOrEqual(r.max_units);
    expect(r.lot_sqft, name).toBe(inputs.lot_sqft);
    expect(r.height_limit, name).toBe(inputs.height_limit);
    expect(Number.isFinite(r.rlv), name).toBe(true);
    if (inputs.max_units !== undefined) expect(r.max_units, name).toBeLessThanOrEqual(inputs.max_units);
  });

  it.each(cases)("%s splits the stalls and bicycle spaces without losing any", (name, inputs) => {
    const r = calcSingle(inputs);
    expect((r.surface_stalls ?? 0) + (r.ground_floor_stalls ?? 0) + (r.podium_stalls ?? 0), name).toBe(
      r.parking_stalls
    );
    expect((r.bicycle_short_term ?? 0) + (r.bicycle_long_term ?? 0), name).toBe(r.bicycle_spaces ?? 0);
  });

  it("builds retail only where the zone permits it", () => {
    for (const [name, inputs] of cases) {
      const r = calcSingle(inputs);
      if (!inputs.include_retail || inputs.program === "bill7" || r.max_units === 0) continue;
      if (permitsGroundFloorRetail(inputs.zone_class!)) expect(r.net_commercial_sqft, name).toBeGreaterThan(0);
      else expect(r.net_commercial_sqft, name).toBe(0);
    }
  });
});

describe("calculator parking", () => {
  for (const program of ["bill6", "standard", "h201"] as const) {
    it(`${program}: defaults to the Article 6 minimum for the unit mix`, () => {
      const inputs = CASES[program];
      expect(inputs.parking_ratio).toBe(legalParkingRatio(inputs.unit_type!));
      const r = calcSingle(inputs);
      expect(r.parking_stalls).toBe(roundHalfUp(inputs.parking_ratio! * r.max_units));
      // the calculator applies no § 21-6.20(a) exemption
      expect(inputs.parking_exempt).toBeUndefined();
      expect(r.parking_stalls).toBeGreaterThan(0);
    });
  }

  it("bill7 and TOD default to no car parking", () => {
    for (const [name, inputs] of [...casesOf("bill7"), ...casesOf("tod")]) {
      expect(inputs.parking_ratio, name).toBe(0);
      if (!inputs.include_retail) expect(calcSingle(inputs).parking_stalls, name).toBe(0);
    }
  });

  it("bill7 has no loading or bicycle parking", () => {
    for (const [name, inputs] of casesOf("bill7")) {
      const r = calcSingle(inputs);
      expect(r.loading_spaces ?? 0, name).toBe(0);
      expect(r.bicycle_spaces ?? 0, name).toBe(0);
    }
  });
});

describe("calculator TOD", () => {
  it("uses the gauge's envelope for the same lot, generous height", () => {
    for (const [name, { regime, tier }] of Object.entries(TOD_CASES)) {
      const inputs = CASES[name];
      const parcel: Parcel = {
        lot_sqft: inputs.lot_sqft!,
        zone_class: inputs.zone_class!,
        height: CASES.tod.height_limit!,
        tod_regime: regime,
        slu_urban: true,
        tod_precinct: "core",
      };
      const env = pathwayEnvelope("tod", parcel, { tier, generous_height: true });
      expect(inputs.height_limit, name).toBe(env.height_limit);
      expect(inputs.max_far, name).toBeCloseTo(env.max_far, 9);
      expect(inputs.max_units, name).toBe(env.max_units);
      expect(inputs.open_space_bonus ?? 0, name).toBe(env.open_space_bonus ?? 0);
      expect(inputs.front_no_parking_ft, name).toBe(regime === "pdt" ? PDT_FRONT_NO_PARKING_FT : undefined);
    }
  });

  it("builds at least as much at higher tiers", () => {
    const units = (name: keyof typeof TOD_CASES) => calcSingle(CASES[name]).max_units;
    expect(units("tod PD-T tier 1")).toBeGreaterThanOrEqual(units("tod PD-T tier 0"));
    expect(units("tod PD-T tier 2")).toBeGreaterThanOrEqual(units("tod PD-T tier 1"));
    expect(units("tod PD-T tier 3")).toBeGreaterThanOrEqual(units("tod PD-T tier 0"));
    expect(units("tod IPD-T tier 3")).toBeGreaterThanOrEqual(units("tod IPD-T tier 0"));
  });

  it("shows no housing on industrial land short of IPD-T approval", () => {
    const inputs = CASES["tod IPD-T industrial"];
    expect(inputs.zone_class).toBe("I-2");
    expect(calcSingle(inputs).max_units).toBe(0);
  });
});

describe("calculator Max FAR follows the gauge's pathway FAR", () => {
  for (const program of ["bill6", "standard", "h201"] as const) {
    it(program, () => {
      const inputs = CASES[program];
      const env = pathwayEnvelope(program, {
        lot_sqft: inputs.lot_sqft!,
        zone_class: inputs.zone_class!,
        height: inputs.height_limit!,
      });
      expect(inputs.max_far).toBeCloseTo(env.max_far, 9);
      expect(inputs.open_space_bonus ?? 0).toBeCloseTo(env.open_space_bonus ?? 0, 9);
    });
  }

  it("bill7", () => expect(CASES.bill7.max_far).toBe(BILL7_FAR));
});
