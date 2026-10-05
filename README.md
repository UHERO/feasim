# @uhero-data/policy-simulator

UHERO's development feasibility model for Oahu housing policy pathways (Standard, Bill 7, TOD, 201H, and the pre–Ord. 26-7). Given one set of inputs describing a lot and the market and policy assumptions, it returns the project's pro forma: units, costs, income, financing, residual land value, and developer returns.

## Install

```sh
npm install @uhero-data/policy-simulator
```

## Usage
> **Note:** This package has two usages: multi-parcel simulation (`calcParcel`) and single-hypothetical-parcel simulation (`calcSingle`). 

**A real parcel under a pathway.** `calcParcel` applies the pathway's rules (ex. its FAR, Bill 7's 60 ft height cap, TOD's FAR bonus, a default height when the parcel has none) and its default assumptions, then runs the model:

```ts
import { calcParcel, overallLevel } from "@uhero-data/policy-simulator";

const parcel = { tmk: "11061028", lot_sqft: 20000, zone_class: "BMX-3", height: 150 };

const output = calcParcel("bill7", parcel);
output.max_units;      // potential units
output.dev_roc;        // return on cost
overallLevel(output);  // "strong" | "marginal" | "poor"

// change any assumption; height_limit / max_far override the envelope
// (bill 7 still builds to at most 60 ft)
calcParcel("bill7", parcel, { land_cost: 250, height_limit: 75 });

// many parcels
const outputs = parcels.map((p) => calcParcel("tod", p));
```

**Any set of inputs.** `calcSingle` is the model itself: one flat set of
inputs in, one pro forma out. `program` picks the pathway; inputs left out
fall back to the model's defaults.

```ts
import { calcSingle, DEFAULT_INPUTS } from "@uhero-data/policy-simulator";

calcSingle({ ...DEFAULT_INPUTS.standard, lot_sqft: 10000, zone_class: "A-2",
             height_limit: 40, max_far: 1.3 });
```

| Export | What it is |
| --- | --- |
| `calcParcel(program, parcel, levers?)` | a real parcel's pro forma |
| `parcelInputs(program, parcel, levers?)` | the inputs `calcParcel` runs |
| `pathwayEnvelope(program, parcel)` | the height limit and FAR a pathway gives a parcel |
| `DEFAULT_INPUTS[program]` | each pathway's default assumptions (no `cap_rate`: the zone's rate is used) |
| `calcSingle(inputs)` | the model: `SliderInputs` in, `ParcelOutput` out |
| `overallLevel(output)` | the feasibility verdict/output |

## Source

The model was copied from `UHERO/analytics` at commit `00640ace` (branch `gauge-v10-sakura`, 9/29/26):

| Here | In analytics |
| --- | --- |
| `src/calculations/*.ts` | `app/housing/policy/calculator/calculations/*.ts` (unchanged) |
| `src/feasibility.ts` | `app/housing/policy/shared/feasibility.ts` (import path only) |
| `src/parcels.ts` | the Policy Gauge's pathway rules (`gauge/calculations/calc-*.ts`) and default assumptions (`gauge/dashboard.tsx`), rewritten as one module; results identical to the gauge's for every parcel |

**Note: the two copies must be kept in sync, make any model change in both places.**

## Development

```sh
npm install          # install dev dependencies
npm test             # run the tests
npx vitest run -u    # re-record the pinned results after a deliberate change
npm run build        # build dist
```

### Tests

All tests are in `test/model.test.ts`:

- **Snapshots** pin every output of the model for each pathway: its defaults,
  scenarios that exercise its branches (grants, the Bill 7 tax exemption, park
  dedication, retail, impact fees, financing, envelope), and a spread of real
  Oʻahu parcels (every zone, with the smallest, median and largest lot and the
  tallest height) through `calcParcel`. The pinned results live in
  `test/__snapshots__/model.test.ts.snap`. The first ones matched the
  dashboard's results exactly.
- **Behaviour checks** that must hold whatever the numbers: the same inputs give
  the same outputs, inputs are never modified, unit counts are whole and
  consistent, and policy rules such as Bill 7's 60 ft cap and park waiver.

Any change that moves a result fails the snapshot tests, on purpose. If the
change is intended, run `npx vitest run -u`, review the snapshot diff in git
(it shows exactly which outputs moved, and by how much), and commit it with the
change.