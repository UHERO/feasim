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
  baseFar,
  calcFAR,
  calcFarPdt,
  calcFarTod,
  openSpaceBonus,
  todIneligibleReason,
  todOpenSpaceCostSqft,
  todPlanCeiling,
  todEligible,
  todHeightLimit,
  todHeightPdt,
  todUseZone,
  residentialUse,
  OPEN_SPACE_FAR_CEILING,
  TOD_ELIGIBLE_DISTRICTS,
  TOD_MAX_FAR,
  TOD_MAX_HEIGHT_FT,
  TOD_MIN_LOT_SQFT,
  TOD_PLAN_STANDARDS,
  calcWaterFees,
  fireMeterSize,
  FIRE_METER_CHARGE,
  livingStories,
  mixFixtureUnits,
  WSFC_PER_FU,
  WSFC_WAIVER_UNIT_CAP,
  wsfcCategory,
  calcFarBill6,
  calcParcel,
  calcSingle,
  overallLevel,
  parcelInputs,
  pathwayEnvelope,
  type Parcel,
  type ProgramId,
  type SliderInputs,
  calcParkingIncome,
  floorPlates,
  PARKING,
  podiumEnvelope,
  stepBackOf,
  yardFootprint,
  zoneStepBack,
} from "../src";
import { calcSoftCosts, setbackFootprint } from "../src/calculations/calc-shared";

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
        // the minimum DSCR the loan was sized to: Bill 7 defaults to 1.15, the
        // other pathways to 1.2
        const minDscr = inputs.min_dscr ?? (program === "bill7" ? 1.15 : 1.2);
        if (r.dev_dscr !== minDscr) continue;
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
    // no TOD regime on this parcel, so it keeps its base FAR (see "TOD pathway")
    expect(pathwayEnvelope("tod", low).max_far).toBe(baseFar("A-2", 20000));
  });

  it("keeps the zoned height, except Bill 7 caps it at 60 ft", () => {
    for (const program of PROGRAMS) {
      const expected = program === "bill7" ? BILL7_MAX_HEIGHT : 150;
      expect(pathwayEnvelope(program, tall).height_limit, program).toBe(expected);
      expect(pathwayEnvelope(program, low).height_limit, program).toBe(40);
    }
  });

  it("falls back to the pathway's default height when none is recorded", () => {
    const defaults = { bill6: 30, bill7: 30, standard: 30, h201: 60 };
    for (const program of ["bill6", "bill7", "standard", "h201"] as const) {
      expect(pathwayEnvelope(program, unknownHeight).height_limit, program).toBe(
        defaults[program]
      );
    }
  });

  it("reports TOD parcels with no recorded height as not modeled", () => {
    const envelope = pathwayEnvelope("tod", { ...unknownHeight, tod_regime: "ipdt" });
    expect(envelope.status).toBe("not_modeled");
    expect(envelope.height_limit).toBe(0);
  });
});

describe("parcelInputs", () => {
  it("is the pathway defaults plus the parcel's envelope", () => {
    for (const program of PROGRAMS) {
      const { height_limit, max_far } = pathwayEnvelope(program, low);
      expect(parcelInputs(program, low)).toEqual({
        ...DEFAULT_INPUTS[program],
        program,
        lot_sqft: 20000,
        zone_class: "A-2",
        height_limit,
        max_far,
        // TOD also passes the open-space bonus: none outside IPD-T
        ...(program === "tod" ? { open_space_bonus: 0 } : {}),
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

// ── TOD pathway (§ 21-9.100-5) ─────────────────────────────────────────────

// Real TOD parcels from analytics' gauge data, one per case, plus synthetic
// ones for the gates no real parcel hits.
const TOD = {
  ipdtCore: { tmk: "15005040", zone_class: "BMX-3", lot_sqft: 20071, height: 200, tod_regime: "ipdt", slu_urban: true, station_area: "Downtown", tod_precinct: "core" },
  ipdtTiz: { tmk: "12001092", zone_class: "BMX-3", lot_sqft: 20898, height: 200, tod_regime: "ipdt", slu_urban: true, station_area: "Kalihi", tod_precinct: "tiz" },
  ipdtNoPlanFar: { tmk: "11010009", zone_class: "B-2", lot_sqft: 123676, height: 60, tod_regime: "ipdt", slu_urban: true, station_area: "Airport", tod_precinct: "core" },
  pdtMapBonus: { tmk: "94010101", zone_class: "BMX-3", lot_sqft: 32588, height: 60, tod_regime: "pdt", slu_urban: true, tod_map_bonus_height: 60, station_area: "Waipahu", tod_precinct: "tiz" },
  smallLot: { tmk: "12001009", zone_class: "BMX-3", lot_sqft: 9557, height: 200, tod_regime: "ipdt", slu_urban: true, station_area: "Kalihi", tod_precinct: "tiz" },
  notUrban: { tmk: "91016183", zone_class: "BMX-3", lot_sqft: 68825, height: 90, tod_regime: "ipdt", slu_urban: false, tod_map_bonus_height: 120, station_area: "East Kapolei", tod_precinct: "tiz" },
  // synthetic
  pdtNoMapBonus: { lot_sqft: 30000, zone_class: "BMX-3", height: 60, tod_regime: "pdt", slu_urban: true },
  ineligibleZone: { lot_sqft: 30000, zone_class: "R-5", height: 30, tod_regime: "ipdt", slu_urban: true },
  pdtIndustrial: { lot_sqft: 30000, zone_class: "I-2", height: 60, tod_regime: "pdt", slu_urban: true },
  outside: { lot_sqft: 30000, zone_class: "BMX-3", height: 60 },
} satisfies Record<string, Parcel>;

describe("TOD pathway", () => {
  it("applies every eligibility gate, with a reason", () => {
    expect(todIneligibleReason(TOD.ipdtCore)).toBeNull();
    expect(todIneligibleReason(TOD.pdtMapBonus)).toBeNull();
    expect(todIneligibleReason(TOD.outside)).toMatch(/outside every TOD special district/);
    expect(todIneligibleReason(TOD.ineligibleZone)).toMatch(/not an eligible district/);
    expect(todIneligibleReason(TOD.smallLot)).toMatch(/20,000 sqft minimum/);
    expect(todIneligibleReason(TOD.notUrban)).toMatch(/urban district/);
    expect(todIneligibleReason(TOD.pdtIndustrial)).toMatch(/not permitted .* under PD-T/);
    // the same industrial zone is fine under IPD-T, which imports BMX-3 uses
    expect(todIneligibleReason({ ...TOD.pdtIndustrial, tod_regime: "ipdt" })).toBeNull();
  });

  it("keeps an ineligible parcel at its base FAR and zoned height", () => {
    for (const parcel of [TOD.outside, TOD.smallLot, TOD.notUrban, TOD.ineligibleZone]) {
      const envelope = pathwayEnvelope("tod", parcel);
      expect(envelope.status).toBe("ineligible");
      expect(envelope.max_far).toBe(baseFar(parcel.zone_class, parcel.lot_sqft));
      expect(envelope.height_limit).toBe(parcel.height);
    }
  });

  it("builds PD-T to the minor SD ladder at base and the PD-T ladder with benefits", () => {
    const p = TOD.pdtNoMapBonus;
    const base = pathwayEnvelope("tod", p, { tier: "base" });
    const full = pathwayEnvelope("tod", p, { tier: "with_benefits" });
    expect(base).toMatchObject({ status: "eligible", far_source: "pdt_ladder", height_source: "base" });
    expect(base.max_far).toBe(calcFarPdt(p.zone_class, p.lot_sqft, "minor_sd"));
    expect(full.max_far).toBe(calcFarPdt(p.zone_class, p.lot_sqft, "pdt"));
    // the map's bonus height only counts with benefits
    expect(pathwayEnvelope("tod", TOD.pdtMapBonus, { tier: "with_benefits" }).height_source).toBe("pdt_map_bonus");
    expect(pathwayEnvelope("tod", TOD.pdtMapBonus, { tier: "base" }).height_source).toBe("base");
  });

  it("builds IPD-T to the formula at base and the plan ceiling with benefits", () => {
    const p = TOD.ipdtCore;
    const plan = todPlanCeiling(p.station_area, p.tod_precinct);
    const base = pathwayEnvelope("tod", p, { tier: "base" });
    const full = pathwayEnvelope("tod", p, { tier: "with_benefits" });
    expect(base.far_source).toBe("ipdt_formula");
    expect(base.max_far).toBe(calcFarTod(p.zone_class, p.lot_sqft, openSpaceBonus(p.zone_class)));
    expect(plan.far).not.toBeNull();
    expect(full.far_source).toBe("plan_ceiling");
    expect(full.max_far).toBe(calcFarTod(p.zone_class, p.lot_sqft, openSpaceBonus(p.zone_class), plan.far!));
    // where the plan sets no FAR, the formula applies in both tiers
    expect(pathwayEnvelope("tod", TOD.ipdtNoPlanFar, { tier: "with_benefits" }).far_source).toBe("ipdt_formula");
  });

  it("never lets a plan's height cap fall below the zoned height", () => {
    for (const parcel of [TOD.ipdtCore, TOD.ipdtTiz, TOD.ipdtNoPlanFar]) {
      for (const tier of ["base", "with_benefits"] as const) {
        expect(pathwayEnvelope("tod", parcel, { tier }).height_limit).toBeGreaterThanOrEqual(parcel.height);
      }
    }
  });

  it("passes the open-space bonus for IPD-T only, and counts the ground it uses", () => {
    const ipdt = TOD.ipdtTiz;
    expect(parcelInputs("tod", ipdt).open_space_bonus).toBe(openSpaceBonus(ipdt.zone_class));
    expect(parcelInputs("tod", ipdt, {}, { density_bonus: 1.5 }).open_space_bonus).toBe(1.5);
    expect(parcelInputs("tod", TOD.pdtMapBonus).open_space_bonus).toBe(0);
    expect(todOpenSpaceCostSqft(ipdt, 1.5)).toBe((1.5 * ipdt.lot_sqft) / 5);
    expect(todOpenSpaceCostSqft(TOD.pdtMapBonus, 1.5)).toBe(0);
  });

  it("results for every TOD case match the snapshot", () => {
    const results = Object.entries(TOD).flatMap(([name, parcel]) =>
      (["base", "with_benefits"] as const).map((tier) => {
        const output = calcParcel("tod", parcel, {}, { tier });
        return { case: name, tier, envelope: pathwayEnvelope("tod", parcel, { tier }), level: overallLevel(output), output };
      })
    );
    expect(rounded(results)).toMatchSnapshot();
  });
});

// ── TOD rules and the TOD pro forma, tested directly ───────────────────────

describe("TOD rules", () => {
  it("gates the IPD-T bonuses on district and the 20,000 sqft minimum", () => {
    expect(TOD_MIN_LOT_SQFT).toBe(20000);
    expect(todEligible("BMX-3", 20000)).toBe(true);
    expect(todEligible("BMX-3", 19999)).toBe(false);
    expect(todEligible("R-5", 50000)).toBe(false);
    for (const zone of TOD_ELIGIBLE_DISTRICTS) expect(todEligible(zone, 20000)).toBe(true);
  });

  it("imports BMX-3 uses into every district but BMX-4", () => {
    expect(todUseZone("BMX-4")).toBe("BMX-4");
    for (const zone of ["A-2", "B-2", "BMX-3", "I-2", "IMX-1", "Resort"]) expect(todUseZone(zone)).toBe("BMX-3");
  });

  it("permits housing everywhere except industrial districts under PD-T", () => {
    expect(residentialUse("A-2", "pdt")).toBe("permitted");
    expect(residentialUse("BMX-3", "ipdt")).toBe("permitted");
    expect(residentialUse("I-2", "ipdt")).toBe("permitted");
    expect(residentialUse("IMX-1", "pdt")).toBe("discretionary");
    for (const zone of ["I-1", "I-2", "I-3"]) expect(residentialUse(zone, "pdt")).toBe("not_permitted");
  });

  it("sizes the open-space bonus up to the district's FAR ceiling", () => {
    for (const [zone, ceiling] of Object.entries(OPEN_SPACE_FAR_CEILING)) {
      expect(openSpaceBonus(zone)).toBe(Math.max(0, ceiling - baseFar(zone)));
      expect(baseFar(zone) + openSpaceBonus(zone)).toBeGreaterThanOrEqual(ceiling);
    }
    // districts without a ceiling get no bonus
    for (const zone of ["A-2", "AMX-3", "I-2", "Resort"]) expect(openSpaceBonus(zone)).toBe(0);
  });

  it("uses the apartment table for A/AMX districts and calcFAR for the rest", () => {
    for (const zone of ["A-1", "A-2", "A-3", "AMX-1", "AMX-2", "AMX-3"]) {
      expect(baseFar(zone, 30000)).toBe(calcFarBill6(zone));
    }
    for (const zone of ["B-2", "BMX-3", "I-2"]) expect(baseFar(zone, 30000)).toBe(calcFAR(zone, 30000));
  });

  it("doubles FAR after the bonus in business districts and before it elsewhere, capped at 7.5", () => {
    const lot = 30000;
    // too small: no TOD bonus at all
    expect(calcFarTod("BMX-3", 10000)).toBe(baseFar("BMX-3", 10000));
    // B/BMX/IMX: 2 x (base + bonus)
    expect(calcFarTod("B-2", lot, 1)).toBe(Math.min(2 * (baseFar("B-2", lot) + 1), TOD_MAX_FAR));
    // apartment districts: 2 x base + bonus
    expect(calcFarTod("A-2", lot, 1)).toBe(Math.min(2 * baseFar("A-2", lot) + 1, TOD_MAX_FAR));
    // the default bonus is the district's open-space bonus
    expect(calcFarTod("BMX-3", lot)).toBe(calcFarTod("BMX-3", lot, openSpaceBonus("BMX-3")));
    // nothing exceeds the cap without a plan
    for (const zone of TOD_ELIGIBLE_DISTRICTS) {
      expect(calcFarTod(zone, lot)).toBeLessThanOrEqual(TOD_MAX_FAR);
      expect(calcFarTod(zone, lot, 5)).toBeLessThanOrEqual(TOD_MAX_FAR);
    }
  });

  it("lets a station-area plan raise FAR above the cap but never lower it", () => {
    const capped = calcFarTod("BMX-4", 30000);
    expect(calcFarTod("BMX-4", 30000, undefined, 10)).toBe(10);
    expect(calcFarTod("BMX-4", 30000, undefined, 1)).toBe(capped);
    // and a plan does nothing for an ineligible lot
    expect(calcFarTod("BMX-4", 10000, undefined, 10)).toBe(baseFar("BMX-4", 10000));
  });

  it("follows the PD-T FAR ladder for each district family", () => {
    const lot = 30000;
    for (const zone of ["B-2", "BMX-3"]) {
      expect(calcFarPdt(zone, lot, "minor_sd")).toBe(3.5);
      expect(calcFarPdt(zone, lot, "major_sd")).toBe(3.5);
      expect(calcFarPdt(zone, lot, "pdt")).toBe(7.0);
    }
    for (const zone of ["A-2", "AMX-3", "I-2", "IMX-1"]) {
      expect(calcFarPdt(zone, lot, "minor_sd")).toBeCloseTo(1.2 * baseFar(zone, lot), 12);
      expect(calcFarPdt(zone, lot, "pdt")).toBe(2 * baseFar(zone, lot));
    }
    // not on the ladder: base FAR on every route
    for (const route of ["base", "minor_sd", "major_sd", "pdt"] as const) {
      expect(calcFarPdt("Resort", lot, route)).toBe(baseFar("Resort", lot));
    }
    expect(calcFarPdt("BMX-3", lot)).toBe(7.0); // defaults to the PD-T route
  });

  it("follows the PD-T height ladder", () => {
    expect(todHeightPdt(60, "base")).toBe(60);
    // +60 ft or double, whichever is lower
    expect(todHeightPdt(40, "minor_sd")).toBe(80);
    expect(todHeightPdt(200, "minor_sd")).toBe(260);
    // +120 ft or triple, whichever is lower
    expect(todHeightPdt(40, "major_sd")).toBe(120);
    expect(todHeightPdt(200, "major_sd")).toBe(320);
    // PD-T: the map's bonus height, else the zoned height
    expect(todHeightPdt(60, "pdt", 150)).toBe(150);
    expect(todHeightPdt(60, "pdt")).toBe(60);
    expect(todHeightPdt(60)).toBe(60);
  });

  it("doubles height to at most 450 ft without a plan, and keeps a higher zoned height under one", () => {
    expect(TOD_MAX_HEIGHT_FT).toBe(450);
    expect(todHeightLimit("BMX-3", 30000, 60)).toBe(120);
    expect(todHeightLimit("BMX-3", 30000, 300)).toBe(450);
    expect(todHeightLimit("BMX-3", 30000, 60, 250)).toBe(250);
    expect(todHeightLimit("BMX-3", 30000, 300, 250)).toBe(300);
    // ineligible: the zoned height, plan or not
    expect(todHeightLimit("BMX-3", 10000, 60, 250)).toBe(60);
    expect(todHeightLimit("R-5", 30000, 30)).toBe(30);
  });

  it("reads plan ceilings by station area and precinct", () => {
    expect(todPlanCeiling(null, "core")).toEqual({ far: null, height: null, approximate: false });
    expect(todPlanCeiling("Nowhere", "tiz")).toEqual({ far: null, height: null, approximate: false });
    const ala = TOD_PLAN_STANDARDS["Ala Moana"];
    expect(todPlanCeiling("Ala Moana", "core")).toEqual({ far: ala.core_max_far, height: ala.core_max_height, approximate: true });
    expect(todPlanCeiling("Ala Moana", "tiz")).toEqual({ far: ala.tiz_max_far, height: ala.tiz_max_height, approximate: true });
  });

  it("has plan standards that make sense", () => {
    for (const [area, std] of Object.entries(TOD_PLAN_STANDARDS)) {
      expect(std.source, area).toBeTruthy();
      for (const value of [std.core_max_far, std.tiz_max_far, std.core_max_height, std.tiz_max_height]) {
        if (value != null) expect(value, area).toBeGreaterThan(0);
      }
      // the core precinct, nearer the station, is never held lower than the TIZ
      if (std.core_max_far != null && std.tiz_max_far != null) expect(std.core_max_far, area).toBeGreaterThanOrEqual(std.tiz_max_far);
      if (std.core_max_height != null && std.tiz_max_height != null) expect(std.core_max_height, area).toBeGreaterThanOrEqual(std.tiz_max_height);
    }
  });
});

describe("TOD model", () => {
  const site: SliderInputs = { program: "tod", zone_class: "BMX-3", lot_sqft: 30000, height_limit: 200 };

  it("assumes 18 months of permitting unless told otherwise", () => {
    const output = calcSingle(site);
    expect(output.permitting_months).toBe(18);
    expect(output).toEqual(calcSingle({ ...site, permitting_months: 18 }));
    expect(calcSingle({ ...site, permitting_months: 12 }).permitting_months).toBe(12);
  });

  it("has no affordable-unit requirement", () => {
    for (const extra of [{}, { zone_class: "A-2" }, { include_retail: true }]) {
      const output = calcSingle({ ...site, ...extra });
      expect(output.max_units).toBeGreaterThan(0);
      expect(output.affordable_units).toBe(0);
      expect(output.afd_rent_units).toBe(0);
      expect(output.afd_sale_units).toBe(0);
    }
  });

  it("takes its FAR from the TOD formula unless max_far is given", () => {
    expect(calcSingle(site).buildable_sqft).toBeLessThanOrEqual(calcFarTod("BMX-3", 30000) * 30000);
    expect(calcSingle({ ...site, max_far: 1 }).buildable_sqft).toBeLessThanOrEqual(30000);
  });

  it("builds less when the open-space bonus uses ground and coverage binds", () => {
    // low height so lot coverage, not FAR, sets the building
    const tight: SliderInputs = { ...site, height_limit: 30, max_far: 7 };
    const without = calcSingle({ ...tight, open_space_bonus: 0 });
    const withBonus = calcSingle({ ...tight, open_space_bonus: 1.5 });
    expect(withBonus.buildable_sqft).toBeLessThan(without.buildable_sqft);
    // no bonus is the same as leaving it out
    expect(calcSingle(tight)).toEqual(without);
    // the bonus can't take more than the whole lot
    expect(calcSingle({ ...tight, open_space_bonus: 100 }).buildable_sqft).toBe(0);
  });

  it("puts retail in industrial districts through the imported BMX-3 uses", () => {
    const industrial = calcSingle({ ...site, zone_class: "I-2", include_retail: true });
    expect(industrial.net_commercial_sqft).toBeGreaterThan(0);
    // retail is a share of the ground floor: doubling the share doubles it
    const doubled = calcSingle({ ...site, zone_class: "I-2", include_retail: true, retail_share: 0.2 });
    expect(doubled.net_commercial_sqft).toBeCloseTo(2 * industrial.net_commercial_sqft, 6);
    expect(calcSingle({ ...site, zone_class: "I-2" }).net_commercial_sqft).toBe(0);
  });
});

// ── BWS water charges: WSFC and new meter cost ────────────────────────────

describe("BWS water charges", () => {
  const fees = (max_units: number, water_chargeable_units: number, living_stories: number, fu_per_unit: number) =>
    calcWaterFees({ max_units, water_chargeable_units, living_stories, fu_per_unit });

  it("prices WSFC at the low-rise rate up to 3 stories and the high-rise rate above", () => {
    expect(wsfcCategory(1)).toBe("multi_low_rise");
    expect(wsfcCategory(3)).toBe("multi_low_rise");
    expect(wsfcCategory(4)).toBe("multi_high_rise");
    expect(WSFC_PER_FU.multi_low_rise).toBe(271.27);
    expect(WSFC_PER_FU.multi_high_rise).toBe(204.12);
  });

  it("matches the spec's charge per dwelling unit", () => {
    const perUnit = (fu: number, stories: number) => Math.round((fees(100, 100, stories, fu).wsfc / 100) * 100) / 100;
    expect(perUnit(7.5, 3)).toBe(2034.53);
    expect(perUnit(7.5, 4)).toBe(1530.9);
    expect(perUnit(9.8, 3)).toBe(2658.45);
    expect(perUnit(9.8, 4)).toBe(2000.38);
    expect(perUnit(11.4, 3)).toBe(3092.48);
    expect(perUnit(11.4, 4)).toBe(2326.97);
  });

  it("reproduces BWS's worked examples, with no common-area fixtures", () => {
    expect(fees(10, 10, 3, 13.8).total_fu).toBeCloseTo(138, 9);
    expect(fees(30, 30, 3, 13.8).total_fu).toBeCloseTo(414, 9);
    expect(fees(40, 40, 8, 12.9).total_fu).toBeCloseTo(516, 9);
    expect(fees(100, 100, 8, 12.9).total_fu).toBeCloseTo(1290, 9);
  });

  it("charges at least 20 fixture units", () => {
    expect(fees(2, 2, 2, 7.5).wsfc).toBeCloseTo(20 * 271.27, 9);
  });

  it("assigns fixture units by baths per unit type, blended over the mix", () => {
    expect(mixFixtureUnits("studio_100")).toBe(7.5);
    expect(mixFixtureUnits("one_bb_100")).toBe(7.5);
    expect(mixFixtureUnits("two_bb_100")).toBe(9.8);
    expect(mixFixtureUnits("one_br50_2br50")).toBeCloseTo((7.5 + 9.8) / 2, 12);
  });

  it("sizes the fire meter by residential stories", () => {
    expect([1, 3, 4, 6, 7, 30].map(fireMeterSize)).toEqual(["4", "4", "6", "6", "8", "8"]);
    expect(fees(10, 10, 3, 7.5).water_meter).toBe(FIRE_METER_CHARGE["4"]);
    expect(fees(10, 10, 5, 7.5).water_meter).toBe(FIRE_METER_CHARGE["6"]);
    expect(fees(10, 10, 12, 7.5).water_meter).toBe(FIRE_METER_CHARGE["8"]);
  });

  it("waives WSFC on the waived units' fixture units and the meter by their share of units", () => {
    const some = fees(100, 40, 8, 7.5);
    expect(some.wsfc).toBeCloseTo(40 * 7.5 * 204.12, 6);
    expect(some.water_meter).toBeCloseTo(FIRE_METER_CHARGE["8"] * 0.4, 9);
    // a fully waived project pays nothing, not even the 20 FU minimum
    expect(fees(50, 0, 3, 9.8)).toMatchObject({ wsfc: 0, water_meter: 0 });
    expect(fees(0, 0, 0, 7.5)).toEqual({ wsfc: 0, water_meter: 0, total_fu: 0 });
  });

  it("counts the stories built, not the stories the height allows", () => {
    // 15 floors allowed, but the floor area fills 3.5 plates
    expect(livingStories(35000, 10000 * 15, 12000 * 15, 15)).toBe(4);
    expect(livingStories(30000, 30000, 40000, 3)).toBe(3);
    expect(livingStories(0, 30000, 40000, 3)).toBe(0);
  });

  it("follows the Impact Fees toggle", () => {
    const site: SliderInputs = { program: "h201", zone_class: "A-2", lot_sqft: 40000, height_limit: 60 };
    const exempt = calcSingle({ ...site, waivable_fee_basis: "none" });
    const market = calcSingle({ ...site, waivable_fee_basis: "market_units" });
    const all = calcSingle({ ...site, waivable_fee_basis: "all_units" });
    expect(exempt.affordable_units).toBeGreaterThan(0);
    expect(market.soft_cost).toBeGreaterThan(exempt.soft_cost);
    expect(all.soft_cost).toBeGreaterThan(market.soft_cost);
    // the envelope never moves with the toggle
    expect(all.max_units).toBe(exempt.max_units);
  });

  it("charges Bill 7 only when the toggle is set to all units", () => {
    const site: SliderInputs = { program: "bill7", zone_class: "A-2", lot_sqft: 10000, height_limit: 40 };
    const byDefault = calcSingle(site);
    expect(calcSingle({ ...site, waivable_fee_basis: "none" })).toEqual(byDefault);
    expect(calcSingle({ ...site, waivable_fee_basis: "all_units" }).soft_cost).toBeGreaterThan(byDefault.soft_cost);
  });

  it("caps the affordable waiver at 500 units per project", () => {
    expect(WSFC_WAIVER_UNIT_CAP).toBe(500);
    // 800 units, 600 affordable, waived on Market Units Only: 500 are waived, 300 pay
    const soft = (affordable_units: number) =>
      calcSoftCosts({ hard_cost: 1e8, lot_sqft: 40000, max_units: 800, affordable_units, excavation_depth: 5, park: "none", park_area: 0, land_cost_per_sqft: 0, waivable_fee_basis: "market_units", impact_fee_per_unit: 0, living_stories: 20, fu_per_unit: 7.5 });
    expect(soft(600).wsfc).toBeCloseTo(300 * 7.5 * 204.12, 6);
    expect(soft(600).water_meter).toBeCloseTo((FIRE_METER_CHARGE["8"] * 300) / 800, 9);
    // under the cap, every affordable unit is waived
    expect(soft(400).wsfc).toBeCloseTo(400 * 7.5 * 204.12, 6);
  });
});

// ── Parking (surface lot, ground floor, podium) and height step-backs ───────

describe("parking", () => {
  const flat = (floors: number, plate: number) => new Array(floors).fill(plate);
  const env = (plates: number[], parking_ratio: number, far_cap = 1e9) =>
    podiumEnvelope({ plates, far_cap, retail_cap: 0, retail_share: 0.1, unit_size: 500, parking_ratio });

  it("uses the documented costs and stall sizes", () => {
    expect(PARKING.stall_sqft).toBe(330);
    expect(PARKING.cost_per_sqft).toBe(190);
    expect(PARKING.surface_stall_sqft).toBe(360);
    expect(PARKING.surface_cost_per_sqft).toBe(30);
    expect(calcParkingIncome(10)).toBe(10 * 100 * 12);
  });

  it("defaults to 0.5 stalls per unit for Standard and Before Ord. 26-7, none elsewhere", () => {
    expect(DEFAULT_INPUTS.bill6.parking_ratio).toBe(0.5);
    expect(DEFAULT_INPUTS.standard.parking_ratio).toBe(0.5);
    expect(DEFAULT_INPUTS.bill7.parking_ratio).toBe(0);
    expect(DEFAULT_INPUTS.tod.parking_ratio).toBe(0);
    expect(DEFAULT_INPUTS.h201.parking_ratio).toBe(0);
  });

  it("builds a surface lot when the stalls fit beside a slimmer building", () => {
    // 6,000 sf over 3 floors needs a 2,000 sf footprint, leaving 3,000 sf open
    const e = env(flat(3, 5000), 0.5, 6000);
    expect(e).toMatchObject({ units: 9, stalls: 5, podium_levels: 0, lobby_sqft: 0 });
    expect(e.parking_sqft).toBe(5 * 360);
    expect(e.parking_cost).toBe(5 * 360 * 30);
  });

  it("puts stalls on the ground floor and housing on the rest of it", () => {
    const e = env(flat(3, 6000), 0.05, 20000);
    expect(e).toMatchObject({ units: 27, stalls: 2, podium_levels: 0, lobby_sqft: 0 });
    // two upper floors plus what the stalls leave on the ground floor
    expect(e.residential_sqft).toBe(12000 + 6000 - 2 * 330);
    expect(e.parking_cost).toBe(2 * 330 * 190);
  });

  it("caps units by stalls rather than adding an empty podium", () => {
    // the ground floor holds 18 stalls; 19 units would need 19
    const e = env(flat(3, 6000), 1, 20000);
    expect(e).toMatchObject({ units: 18, stalls: 18, podium_levels: 0 });
    expect(env(flat(3, 6000), 1.5, 20000)).toMatchObject({ units: 12, stalls: 18, podium_levels: 0 });
  });

  it("charges podium floors whole and makes a too-small ground remainder a lobby", () => {
    const e = env(flat(10, 10000), 0.25);
    expect(e).toMatchObject({ units: 128, stalls: 32, podium_levels: 1 });
    // 30 ground stalls leave 100 sf, too small for a 625 sf unit
    expect(e.lobby_sqft).toBe(100);
    expect(e.parking_sqft).toBe(30 * 330 + 10000);
    expect(e.parking_cost).toBe((30 * 330 + 10000) * 190);
  });

  it("never gives more units for more parking, never exceeds the height limit, and parks every unit", () => {
    for (const floors of [1, 3, 6, 15])
      for (const plate of [2000, 6000, 20000])
        for (const far of [0.5, 2, 100]) {
          let prev = Infinity;
          for (const ratio of [0, 0.05, 0.25, 0.5, 1, 1.5]) {
            const e = env(flat(floors, plate), ratio, plate * far);
            expect(e.units).toBeLessThanOrEqual(prev);
            expect(e.stalls).toBeGreaterThanOrEqual(Math.ceil(ratio * e.units - 1e-9));
            const structured = ratio > 0 && !(e.podium_levels === 0 && e.parking_sqft === e.stalls * 360);
            const groundHomes = structured && e.podium_levels === 0 && e.lobby_sqft === 0;
            const storeys = (structured && !groundHomes ? 1 + e.podium_levels : 0) + e.living_stories;
            if (e.units > 0) expect(storeys).toBeLessThanOrEqual(floors);
            prev = e.units;
          }
        }
  });

  it("leaves the building unchanged with no parking", () => {
    const base: SliderInputs = { program: "bill6", zone_class: "A-2", lot_sqft: 12000, height_limit: 60 };
    const none = calcSingle({ ...base, parking_ratio: 0 });
    expect(none).toMatchObject({ parking_stalls: 0, podium_levels: 0, parking_sqft: 0, parking_share: 0 });
    expect(calcSingle({ ...base, parking_ratio: 1 }).max_units).toBeLessThanOrEqual(none.max_units);
  });
});

describe("height step-backs", () => {
  it("applies the LUO rules by zone", () => {
    for (const zone of ["A-2", "A-3", "AMX-2", "AMX-3", "B-2", "BMX-3", "BMX-4", "IMX-1"])
      expect(zoneStepBack(zone)).toEqual({ trigger_ft: 40, above_ft: 40, ft_per_10ft: 1 });
    expect(zoneStepBack("Resort")).toEqual({ trigger_ft: 30, above_ft: 30, ft_per_10ft: 1 });
    expect(zoneStepBack("Apart")).toEqual({ trigger_ft: 40, above_ft: 40, ft_per_10ft: 1, front: true });
    for (const zone of ["A-1", "AMX-1", "R-5"]) expect(zoneStepBack(zone)).toBeUndefined();
  });

  it("widens the side and rear yards 1 ft per 10 ft above 40 ft", () => {
    const plates = floorPlates({ floors: 15, floor_height: 10, height_limit: 150, lot_sqft: 20000, coverage_plate: 1e9, setback: 10, stepback: zoneStepBack("A-3") });
    const width = Math.sqrt(10000), depth = 2 * width;
    plates.forEach((p, k) => {
      const top = (k + 1) * 10;
      const extra = top > 40 ? Math.ceil((top - 40) / 10) : 0;
      expect(p).toBeCloseTo((width - 2 * (10 + extra)) * (depth - 10 - (10 + extra)), 9);
    });
  });

  it("steps the front back too in the Waikiki Apartment Precinct", () => {
    const [, , , , fifth] = floorPlates({ floors: 5, floor_height: 10, height_limit: 50, lot_sqft: 20000, coverage_plate: 1e9, setback: 10, stepback: zoneStepBack("Apart") });
    expect(fifth).toBeCloseTo(yardFootprint(20000, 11, 11, 11), 9);
  });

  it("leaves equal yards as before and short buildings untouched", () => {
    expect(yardFootprint(10000, 10, 10, 10)).toBe(setbackFootprint(10000, 10));
    const low = floorPlates({ floors: 3, floor_height: 10, height_limit: 30, lot_sqft: 20000, coverage_plate: 1e9, setback: 10, stepback: zoneStepBack("A-2") });
    expect(new Set(low).size).toBe(1);
  });

  it("costs units on a tall height-limited lot, and none in Bill 7", () => {
    const site: SliderInputs = { program: "standard", zone_class: "BMX-3", lot_sqft: 10000, height_limit: 150, max_far: 12, parking_ratio: 0 };
    const stepped = calcSingle(site).max_units;
    const flatOut = calcSingle({ ...site, stepback_trigger_ft: Infinity }).max_units;
    expect(stepped).toBeLessThan(flatOut);
    // the sliders' own step-back overrides the zone's
    expect(stepBackOf({ ...site, stepback_trigger_ft: 75 } as SliderInputs, zoneStepBack("BMX-3"))?.trigger_ft).toBe(75);
    expect(stepBackOf(site, undefined)).toBeUndefined();
  });
});
