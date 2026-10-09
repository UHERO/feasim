// Gauge (Citywide View) tests: real Oahu parcels through calcParcel, as the
// policy gauge runs them.
//
// The parcels (test/data/gauge-parcels.json) are a sample of the gauge's
// parcel files: for each zone (TOD: zone, regime, station area and
// parenthetical; elsewhere: zone and parking exemption), the smallest, median
// and largest lot. See its `_source`.

import { describe, expect, it } from "vitest";

import {
  BILL7_MAX_HEIGHT,
  bicycleRequired,
  calcParcel,
  DEFAULT_INPUTS,
  IMX1_PDT_MAX_UNITS,
  LOADING,
  legalParkingRatio,
  overallLevel,
  parcelInputs,
  pathwayEnvelope,
  PDT_FRONT_NO_PARKING_FT,
  roundHalfUp,
  type Parcel,
  type ParcelOutput,
  type ProgramId,
} from "../src";
import parcels from "./data/gauge-parcels.json";

const SAMPLE = parcels as unknown as Record<ProgramId, Parcel[]>;
const PROGRAMS: ProgramId[] = ["bill6", "bill7", "standard", "tod", "h201"];
const TIERS = ["base", "minor_sd", "major_sd", "with_benefits"] as const;
const INDUSTRIAL = ["I-1", "I-2", "I-3", "IMX-1"];

// round to 10 significant digits: floating-point math can differ in the last
// digit across node versions
const sig = (x: number) => (Number.isFinite(x) ? Number(x.toPrecision(10)) : x);

// the figures the gauge maps and totals, per parcel
function summary(r: ParcelOutput) {
  return {
    tmk: r.tmk,
    units: r.max_units,
    affordable: r.affordable_units,
    stalls: r.parking_stalls,
    loading: r.loading_spaces ?? 0,
    bicycle: r.bicycle_spaces ?? 0,
    podium: r.podium_levels,
    rlv: sig(r.rlv),
    level: overallLevel(r),
  };
}

function totals(rows: ReturnType<typeof summary>[]) {
  const sum = (key: "units" | "affordable" | "stalls" | "loading" | "bicycle") =>
    rows.reduce((s, r) => s + r[key], 0);
  const levels = { poor: 0, marginal: 0, strong: 0 };
  for (const r of rows) levels[r.level]++;
  return {
    parcels: rows.length,
    units: sum("units"),
    affordable: sum("affordable"),
    stalls: sum("stalls"),
    loading: sum("loading"),
    bicycle: sum("bicycle"),
    ...levels,
  };
}

describe("gauge sample", () => {
  it("covers every pathway, zone and flag the gauge maps", () => {
    for (const program of PROGRAMS) expect(SAMPLE[program].length, program).toBeGreaterThan(20);
    const zones = new Set(SAMPLE.bill6.map((p) => p.zone_class));
    for (const zone of ["A-1", "A-2", "AMX-2", "BMX-3", "BMX-4"]) expect(zones).toContain(zone);
    expect(SAMPLE.bill6.some((p) => p.parking_exempt)).toBe(true);
    expect(SAMPLE.bill6.some((p) => !p.parking_exempt)).toBe(true);
    const tod = SAMPLE.tod;
    expect(tod.some((p) => p.tod_regime === "pdt")).toBe(true);
    expect(tod.some((p) => p.tod_regime === "ipdt")).toBe(true);
    expect(tod.some((p) => p.tod_map_bonus_height !== undefined)).toBe(true);
    expect(tod.some((p) => p.station_area === "East Kapolei" && p.tod_regime === "pdt")).toBe(true);
    // the TOD station areas hold no I-1 parcels
    for (const zone of ["I-2", "I-3", "IMX-1"]) expect(tod.some((p) => p.zone_class === zone), zone).toBe(true);
  });
});

describe.each(PROGRAMS)("gauge: %s", (program) => {
  const parcels = SAMPLE[program];
  const results = parcels.map((parcel) => ({ parcel, r: calcParcel(program, parcel) }));

  it("returns whole, consistent unit counts for every parcel", () => {
    for (const { parcel, r } of results) {
      const name = `${parcel.tmk} ${parcel.zone_class}`;
      expect(r.tmk, name).toBe(parcel.tmk);
      expect(r.lot_sqft, name).toBe(parcel.lot_sqft);
      expect(r.zone_class, name).toBe(parcel.zone_class);
      expect(Number.isInteger(r.max_units), name).toBe(true);
      expect(r.max_units, name).toBeGreaterThanOrEqual(0);
      expect(r.affordable_units, name).toBeGreaterThanOrEqual(0);
      expect(r.affordable_units, name).toBeLessThanOrEqual(r.max_units);
      expect(Number.isFinite(r.rlv), name).toBe(true);
      expect(r.parking_stalls, name).toBeGreaterThanOrEqual(0);
    }
  });

  it("builds to the parcel's envelope", () => {
    for (const { parcel, r } of results) {
      const env = pathwayEnvelope(program, parcel);
      expect(r.height_limit, parcel.tmk).toBe(
        program === "bill7" ? Math.min(env.height_limit, BILL7_MAX_HEIGHT) : env.height_limit
      );
      if (program === "bill7") expect(r.height_limit, parcel.tmk).toBeLessThanOrEqual(BILL7_MAX_HEIGHT);
    }
  });

  it("places no loading on lots of 7,500 sqft or less", () => {
    for (const { parcel, r } of results)
      if (parcel.lot_sqft <= LOADING.min_lot_sqft) expect(r.loading_spaces ?? 0, parcel.tmk).toBe(0);
  });

  it("matches the snapshot", () => {
    const rows = results.map(({ r }) => summary(r));
    expect({ totals: totals(rows), parcels: rows }).toMatchSnapshot();
  });
});

describe("gauge: Article 6 parking on real parcels", () => {
  for (const program of ["bill6", "standard", "h201"] as const) {
    it(`${program}: exempt parcels build no stalls, the rest the legal minimum`, () => {
      const ratio = legalParkingRatio(DEFAULT_INPUTS[program].unit_type!);
      let exempt = 0;
      let required = 0;
      for (const parcel of SAMPLE[program]) {
        const r = calcParcel(program, parcel);
        expect(parcelInputs(program, parcel).parking_exempt, parcel.tmk).toBe(parcel.parking_exempt);
        if (parcel.parking_exempt) {
          exempt++;
          expect(r.parking_stalls, parcel.tmk).toBe(0);
        } else {
          required++;
          // no retail by default, so no joint-use reduction
          expect(r.parking_stalls, parcel.tmk).toBe(roundHalfUp(ratio * r.max_units));
        }
      }
      expect(exempt).toBeGreaterThan(0);
      expect(required).toBeGreaterThan(0);
    });

    it(`${program}: bicycle parking outside the industrial districts`, () => {
      for (const parcel of SAMPLE[program]) {
        const r = calcParcel(program, parcel);
        if (!bicycleRequired(parcel.zone_class) || r.max_units === 0)
          expect(r.bicycle_spaces ?? 0, parcel.tmk).toBe(0);
        else expect(r.bicycle_spaces, parcel.tmk).toBeGreaterThan(0);
      }
    });
  }

  it("bill7: no parking, loading or bicycle parking", () => {
    for (const parcel of SAMPLE.bill7) {
      const r = calcParcel("bill7", parcel);
      expect(r.parking_stalls, parcel.tmk).toBe(0);
      expect(r.loading_spaces ?? 0, parcel.tmk).toBe(0);
      expect(r.bicycle_spaces ?? 0, parcel.tmk).toBe(0);
    }
  });

  it("a stall minimum never adds units", () => {
    for (const program of ["bill6", "standard", "h201"] as const)
      for (const parcel of SAMPLE[program].filter((p) => !p.parking_exempt))
        expect(calcParcel(program, parcel).max_units, parcel.tmk).toBeLessThanOrEqual(
          calcParcel(program, { ...parcel, parking_exempt: true }).max_units
        );
  });
});

describe("gauge: TOD on real parcels", () => {
  const tod = SAMPLE.tod;

  it("keeps parking out of the front 40 ft on every PD-T parcel, at every tier", () => {
    for (const parcel of tod)
      for (const tier of TIERS) {
        const inputs = parcelInputs("tod", parcel, {}, { tier });
        expect(inputs.front_no_parking_ft, `${parcel.tmk} ${tier}`).toBe(
          parcel.tod_regime === "pdt" ? PDT_FRONT_NO_PARKING_FT : undefined
        );
      }
  });

  it("marks industrial housing that needs a permit not applicable at base", () => {
    let checked = 0;
    for (const parcel of tod.filter((p) => INDUSTRIAL.includes(p.zone_class))) {
      const env = pathwayEnvelope("tod", parcel, { tier: "base" });
      const eligible = pathwayEnvelope("tod", parcel, { tier: "with_benefits" }).status;
      if (eligible === "ineligible") continue; // fails a § 21-9.100-5(b) gate
      checked++;
      expect(env.status, `${parcel.tmk} ${parcel.zone_class}`).toBe("not_applicable");
      expect(env.status_reason, parcel.tmk).toBeTruthy();
      // I-2 and I-3 do not permit housing under PD-T at any tier
      if (parcel.tod_regime === "pdt" && parcel.zone_class !== "IMX-1")
        for (const tier of TIERS) expect(pathwayEnvelope("tod", parcel, { tier }).status).toBe("not_applicable");
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("caps IMX-1 under PD-T at the unit limit", () => {
    const imx = tod.filter((p) => p.zone_class === "IMX-1" && p.tod_regime === "pdt");
    expect(imx.length).toBeGreaterThan(0);
    for (const parcel of imx)
      for (const tier of TIERS) {
        const env = pathwayEnvelope("tod", parcel, { tier });
        if (env.status !== "eligible") continue;
        expect(env.max_units, `${parcel.tmk} ${tier}`).toBe(IMX1_PDT_MAX_UNITS);
        expect(calcParcel("tod", parcel, {}, { tier }).max_units).toBeLessThanOrEqual(IMX1_PDT_MAX_UNITS);
      }
  });

  it("gives every parcel a status, with a reason unless eligible", () => {
    for (const parcel of tod)
      for (const tier of TIERS) {
        const env = pathwayEnvelope("tod", parcel, { tier });
        expect(["eligible", "ineligible", "not_modeled", "not_applicable"]).toContain(env.status);
        if (env.status !== "eligible") expect(env.status_reason, `${parcel.tmk} ${tier}`).toBeTruthy();
      }
  });

  it("builds no car parking by default but bicycle parking outside industrial zones", () => {
    for (const parcel of tod) {
      if (pathwayEnvelope("tod", parcel).status !== "eligible") continue;
      const r = calcParcel("tod", parcel);
      expect(r.parking_stalls, parcel.tmk).toBe(0);
      if (!bicycleRequired(parcel.zone_class) || r.max_units === 0)
        expect(r.bicycle_spaces ?? 0, parcel.tmk).toBe(0);
      else expect(r.bicycle_spaces, parcel.tmk).toBeGreaterThan(0);
    }
  });

  it("generous height never builds less than strict", () => {
    for (const parcel of tod.filter((p) => p.tod_regime === "pdt"))
      for (const tier of ["minor_sd", "major_sd", "with_benefits"] as const) {
        const strict = pathwayEnvelope("tod", parcel, { tier });
        const generous = pathwayEnvelope("tod", parcel, { tier, generous_height: true });
        expect(generous.height_limit, `${parcel.tmk} ${tier}`).toBeGreaterThanOrEqual(strict.height_limit);
      }
  });

  it("matches the snapshot at every tier", () => {
    const rows = TIERS.map((tier) => {
      const eligible = tod.filter((p) => pathwayEnvelope("tod", p, { tier }).status === "eligible");
      const results = eligible.map((p) => summary(calcParcel("tod", p, {}, { tier })));
      const status: Record<string, number> = {};
      for (const p of tod) {
        const s = pathwayEnvelope("tod", p, { tier }).status ?? "eligible";
        status[s] = (status[s] ?? 0) + 1;
      }
      return { tier, status, totals: totals(results) };
    });
    expect(rows).toMatchSnapshot();
  });
});
