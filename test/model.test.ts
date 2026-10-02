// Tests for @uhero-data/policy-simulator
//
// Snapshots pin every output of the model, so any change that moves a result
// fails here, on purpose. If the change is intended, run `npx vitest run -u`,
// review the snapshot diff in git, and commit it with the change.

import { describe, expect, it } from "vitest";

import {
  BILL7_FAR,
  BILL7_MAX_HEIGHT,
  DEFAULT_INPUTS,
  calcFAR,
  calcFarBill6,
  calcParcel,
  calcSingle,
  overallLevel,
  parcelInputs,
  pathwayEnvelope,
  type Parcel,
  type ProgramId,
  type SliderInputs,
} from "../src";

const PROGRAMS: ProgramId[] = ["bill6", "bill7", "standard", "tod", "h201"];

// Sample of analytic's parcel data: every zone, with the smallest, median and largest lot and the tallest height in each
const PARCELS: Parcel[] = [
  { tmk: "91123111", zone_class: "A-1", lot_sqft: 535, height: 30 },
  { tmk: "94104102", zone_class: "A-1", lot_sqft: 5400, height: 30 },
  { tmk: "91015083", zone_class: "A-1", lot_sqft: 16418288, height: 60 },
  { tmk: "27021007", zone_class: "A-1", lot_sqft: 34433, height: 350 },
  { tmk: "27027049", zone_class: "A-2", lot_sqft: 505, height: 150 },
  { tmk: "23033011", zone_class: "A-2", lot_sqft: 6000, height: 150 },
  { tmk: "91016179", zone_class: "A-2", lot_sqft: 6838136, height: 65 },
  { tmk: "23032059", zone_class: "A-2", lot_sqft: 5323, height: 250 },
  { tmk: "27013048", zone_class: "A-3", lot_sqft: 1482, height: 350 },
  { tmk: "23018076", zone_class: "A-3", lot_sqft: 7765, height: 350 },
  { tmk: "27020001", zone_class: "A-3", lot_sqft: 979159, height: 350 },
  { tmk: "91016214", zone_class: "AMX-1", lot_sqft: 17685, height: 30 },
  { tmk: "91016195", zone_class: "AMX-1", lot_sqft: 47916, height: 30 },
  { tmk: "91016173", zone_class: "AMX-1", lot_sqft: 102758, height: 30 },
  { tmk: "91160062", zone_class: "AMX-2", lot_sqft: 776, height: 60 },
  { tmk: "28001023", zone_class: "AMX-2", lot_sqft: 6483, height: 150 },
  { tmk: "91017196", zone_class: "AMX-2", lot_sqft: 5300991, height: 65 },
  { tmk: "28001055", zone_class: "AMX-2", lot_sqft: 32054, height: 150 },
  { tmk: "23021019", zone_class: "AMX-3", lot_sqft: 13038, height: 250 },
  { tmk: "23017013", zone_class: "AMX-3", lot_sqft: 33644, height: 250 },
  { tmk: "97024035", zone_class: "AMX-3", lot_sqft: 214639, height: 150 },
  { tmk: "23036005", zone_class: "AMX-3", lot_sqft: 77098, height: 350 },
  { tmk: "26014063", zone_class: "Apart", lot_sqft: 500, height: 65 },
  { tmk: "26021084", zone_class: "Apart", lot_sqft: 5400, height: 280 },
  { tmk: "26011001", zone_class: "Apart", lot_sqft: 158521, height: 350 },
  { tmk: "26016068", zone_class: "ApartMix", lot_sqft: 500, height: 300 },
  { tmk: "26012024", zone_class: "ApartMix", lot_sqft: 7699, height: 350 },
  { tmk: "26013014", zone_class: "ApartMix", lot_sqft: 104710, height: 350 },
  { tmk: "91148031", zone_class: "BMX-3", lot_sqft: 515, height: 90 },
  { tmk: "12001067", zone_class: "BMX-3", lot_sqft: 9773, height: 200 },
  { tmk: "91016220", zone_class: "BMX-3", lot_sqft: 8388001, height: 90 },
  { tmk: "23035001", zone_class: "BMX-3", lot_sqft: 420540, height: 350 },
  { tmk: "21010013", zone_class: "BMX-4", lot_sqft: 596, height: 400 },
  { tmk: "17003028", zone_class: "BMX-4", lot_sqft: 6423, height: 40 },
  { tmk: "21018002", zone_class: "BMX-4", lot_sqft: 325049, height: 65 },
  { tmk: "21011001", zone_class: "BMX-4", lot_sqft: 127195, height: 450 },
];

// One change each from the model's defaults:
// ie. grant timing, the Bill 7 tax exemption (affordable rent above or below 80% AMI), 
// park dedication, retail, impact-fee basis, financing and the building envelope
const SCENARIOS: Record<string, Partial<SliderInputs>> = {
  defaults: {},
  "no grant": { grant_type: "none" },
  "pre-construction grant": { grant_type: "pre_construct", grant_amount: 50000 },
  "affordable rent 100% AMI": { affordable_ami: "ami_100" },
  "park in-lieu fee": { park: "in_lieu" },
  "park exempt": { park: "exempt" },
  "ground floor retail": { include_retail: true },
  "impact fees on all units": { waivable_fee_basis: "all_units" },
  "25-year amortization": { amort_years: 25 },
  "5-year hold": { hold_years: 5 },
  "FAR 2, 60 ft, 20 ft setbacks": { max_far: 2, height_limit: 60, setback: 20 },
};

// height / FAR lever settings for real parcels: unlocked, and locked
const LEVERS: Record<string, Partial<SliderInputs>> = {
  unlocked: {},
  "height 30 ft": { height_limit: 30 },
  "height 75 ft": { height_limit: 75 },
  "FAR 2": { max_far: 2 },
  "cap rate 6%": { cap_rate: 0.06 },
};

// every model-input case for one pathway: the scenarios, then each parcel
function casesFor(program: ProgramId): { name: string; inputs: SliderInputs }[] {
  return [
    ...Object.entries(SCENARIOS).map(([name, change]) => ({
      name,
      inputs: { program, ...change },
    })),
    ...PARCELS.map((p) => ({
      name: `parcel ${p.tmk} (${p.zone_class}, ${p.lot_sqft} sqft, ${p.height} ft)`,
      inputs: {
        program,
        lot_sqft: p.lot_sqft,
        zone_class: p.zone_class,
        height_limit: p.height,
      },
    })),
  ];
}

// ── Pinned results ─────────────────────────────────────────────────────────
// node versions can differ in the last digit or two of floating-point math
// so round to 10 sig digits
const SIGNIFICANT_DIGITS = 10;

function rounded(value: unknown): unknown {
  if (typeof value === "number")
    return Number.isFinite(value)
      ? Number(value.toPrecision(SIGNIFICANT_DIGITS))
      : value;
  if (Array.isArray(value)) return value.map(rounded);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, rounded(v)])
    );
  return value;
}

describe.each(PROGRAMS)("%s", (program) => {
  it("model results match the snapshot", () => {
    const results = casesFor(program).map(({ name, inputs }) => {
      const output = calcSingle(inputs);
      return { case: name, inputs, level: overallLevel(output), output };
    });
    expect(rounded(results)).toMatchSnapshot();
  });

  it("parcel results match the snapshot", () => {
    const results = Object.entries(LEVERS).flatMap(([setting, levers]) =>
      PARCELS.map((parcel) => {
        const output = calcParcel(program, parcel, levers);
        return { setting, parcel, level: overallLevel(output), output };
      })
    );
    expect(rounded(results)).toMatchSnapshot();
  });
});

// ── Behaviour that must hold whatever the numbers ──────────────────────────

describe.each(PROGRAMS)("%s model", (program) => {
  const cases = casesFor(program);

  it("gives the same outputs for the same inputs", () => {
    for (const { inputs } of cases) {
      expect(calcSingle(inputs)).toEqual(calcSingle(inputs));
    }
  });

  it("does not modify its inputs", () => {
    for (const { inputs } of cases) {
      // frozen: any write throws, since the model runs in strict mode
      const frozen = Object.freeze({ ...inputs });
      expect(() => calcSingle(frozen)).not.toThrow();
      expect(frozen).toEqual(inputs);
    }
  });

  it("returns whole, consistent unit counts, the given envelope and a verdict", () => {
    for (const { name, inputs } of cases) {
      const r = calcSingle(inputs);
      expect(Number.isInteger(r.max_units), name).toBe(true);
      expect(r.max_units, name).toBeGreaterThanOrEqual(0);
      expect(r.affordable_units, name).toBeGreaterThanOrEqual(0);
      expect(r.affordable_units, name).toBeLessThanOrEqual(r.max_units);
      expect(["poor", "marginal", "strong"], name).toContain(overallLevel(r));
      if (inputs.lot_sqft !== undefined) expect(r.lot_sqft, name).toBe(inputs.lot_sqft);
      if (inputs.zone_class !== undefined)
        expect(r.zone_class, name).toBe(inputs.zone_class);
    }
  });
});

describe("DSCR-sized loans", () => {
  it("are bankable: a loan sized to the minimum DSCR meets it", () => {
    let sized = 0;
    for (const program of PROGRAMS) {
      for (const { name, inputs } of casesFor(program)) {
        const r = calcSingle(inputs);
        if (r.dev_dscr !== 1.2) continue; // sized to the default 1.2 minimum
        sized++;
        expect(r.dev_is_bankable, `${program}: ${name}`).toBe(true);
      }
    }
    expect(sized).toBeGreaterThan(0);
  });
});

describe("policy behaviour", () => {
  const bill7: SliderInputs = { program: "bill7", lot_sqft: 20000, height_limit: 60 };

  it("Bill 7 waives park dedication unless the in-lieu fee is chosen", () => {
    const exempt = calcSingle({ ...bill7, park: "exempt" });
    const inLieu = calcSingle({ ...bill7, park: "in_lieu" });
    expect(calcSingle(bill7).soft_cost).toBe(exempt.soft_cost);
    expect(inLieu.soft_cost).toBeGreaterThan(exempt.soft_cost);
  });

  it("Bill 7's property tax exemption needs affordable rent at 80% AMI or less", () => {
    const at80 = calcSingle({ ...bill7, affordable_ami: "ami_80" });
    const at100 = calcSingle({ ...bill7, affordable_ami: "ami_100" });
    expect(at100.property_tax).toBeGreaterThan(at80.property_tax);
  });

  it("a longer amortization supports a larger, DSCR-sized permanent loan", () => {
    const yrs25 = calcSingle({ ...bill7, amort_years: 25 });
    const yrs30 = calcSingle({ ...bill7, amort_years: 30 });
    expect(yrs30.dev_perm_principal ?? 0).toBeGreaterThan(yrs25.dev_perm_principal ?? 0);
  });

  it("charging impact fees on more units raises soft cost", () => {
    const soft = (basis: SliderInputs["waivable_fee_basis"]) =>
      calcSingle({ ...bill7, waivable_fee_basis: basis }).soft_cost;
    expect(soft("market_units")).toBeGreaterThan(soft("none"));
    expect(soft("all_units")).toBeGreaterThan(soft("market_units"));
  });

  it("a higher FAR never builds less", () => {
    for (const program of PROGRAMS) {
      const at = (max_far: number) =>
        calcSingle({ program, lot_sqft: 20000, height_limit: 450, max_far }).buildable_sqft;
      expect(at(4), program).toBeGreaterThanOrEqual(at(2));
      expect(at(2), program).toBeGreaterThanOrEqual(at(1));
    }
  });
});

// ── Real parcels: the pathway rules ────────────────────────────────────────

const tall: Parcel = { tmk: "11061028", lot_sqft: 20000, zone_class: "BMX-3", height: 150 };
const low: Parcel = { lot_sqft: 20000, zone_class: "A-2", height: 40 };
const unknownHeight: Parcel = { lot_sqft: 9000, zone_class: "A-2", height: 0 };

describe("pathwayEnvelope", () => {
  it("uses each pathway's FAR rule", () => {
    expect(pathwayEnvelope("bill6", low).max_far).toBe(calcFarBill6("A-2"));
    expect(pathwayEnvelope("bill7", low).max_far).toBe(BILL7_FAR);
    expect(pathwayEnvelope("standard", low).max_far).toBe(calcFAR("A-2", 20000));
    expect(pathwayEnvelope("h201", low).max_far).toBe(calcFAR("A-2", 20000));
    expect(pathwayEnvelope("tod", low).max_far).toBe(calcFAR("A-2", 20000) * 2);
  });

  it("keeps the zoned height, except Bill 7 caps it at 60 ft", () => {
    for (const program of PROGRAMS) {
      const expected = program === "bill7" ? BILL7_MAX_HEIGHT : 150;
      expect(pathwayEnvelope(program, tall).height_limit, program).toBe(expected);
      expect(pathwayEnvelope(program, low).height_limit, program).toBe(40);
    }
  });

  it("falls back to the pathway's default height when none is recorded", () => {
    const defaults = { bill6: 30, bill7: 30, standard: 30, tod: 60, h201: 60 };
    for (const program of PROGRAMS) {
      expect(pathwayEnvelope(program, unknownHeight).height_limit, program).toBe(
        defaults[program]
      );
    }
  });
});

describe("parcelInputs", () => {
  it("is the pathway defaults plus the parcel's envelope", () => {
    for (const program of PROGRAMS) {
      expect(parcelInputs(program, low)).toEqual({
        ...DEFAULT_INPUTS[program],
        program,
        lot_sqft: 20000,
        zone_class: "A-2",
        ...pathwayEnvelope(program, low),
      });
    }
  });

  it("lets levers override defaults and the envelope", () => {
    const inputs = parcelInputs("standard", low, { land_cost: 300, height_limit: 90, max_far: 2.5 });
    expect(inputs.land_cost).toBe(300);
    expect(inputs.height_limit).toBe(90);
    expect(inputs.max_far).toBe(2.5);
  });

  it("holds Bill 7 to 60 ft even when a lever asks for more", () => {
    expect(parcelInputs("bill7", tall, { height_limit: 30 }).height_limit).toBe(30);
    expect(parcelInputs("bill7", tall, { height_limit: 75 }).height_limit).toBe(60);
    expect(parcelInputs("bill7", low, { height_limit: 75 }).height_limit).toBe(60);
  });

  it("treats levers set to undefined as not set", () => {
    for (const program of PROGRAMS) {
      expect(
        parcelInputs(program, tall, { height_limit: undefined, max_far: undefined, setback: undefined })
      ).toEqual(parcelInputs(program, tall));
    }
  });

  it("leaves the cap rate to the parcel's zone unless one is given", () => {
    expect(parcelInputs("standard", low).cap_rate).toBeUndefined();
    expect(parcelInputs("standard", low, { cap_rate: 0.06 }).cap_rate).toBe(0.06);
  });

  it("does not modify the parcel, the levers or the defaults", () => {
    const before = JSON.stringify(DEFAULT_INPUTS);
    expect(() =>
      parcelInputs("bill7", Object.freeze({ ...tall }), Object.freeze({ height_limit: 75 }))
    ).not.toThrow();
    expect(JSON.stringify(DEFAULT_INPUTS)).toBe(before);
  });
});

describe("calcParcel", () => {
  it("is calcSingle on parcelInputs, with the parcel's TMK", () => {
    for (const program of PROGRAMS) {
      expect(calcParcel(program, tall, { max_far: 3 })).toEqual({
        ...calcSingle(parcelInputs(program, tall, { max_far: 3 })),
        tmk: "11061028",
      });
    }
  });

  it("keeps the model's own id when the parcel has no TMK", () => {
    expect(calcParcel("bill6", low).tmk).toBe(calcSingle(parcelInputs("bill6", low)).tmk);
  });

  it("builds to the Bill 7 cap, not above it", () => {
    expect(calcParcel("bill7", tall, { height_limit: 75 }).height_limit).toBe(60);
    expect(calcParcel("bill7", tall, { height_limit: 30 }).height_limit).toBe(30);
  });
});
