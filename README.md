# @uhero-data/policy-simulator

UHERO's development feasibility model for Oahu housing policy pathways (Standard, Bill 7, TOD, 201H, and the pre–Ord. 26-7). Given one set of inputs describing a lot and the market and policy assumptions, it returns the project's pro forma: units, costs, income, financing, residual land value, and developer returns.

## Important Notice

The model's source lives in UHERO's analytics repository, to which access cannot be granted outside the organization. This package makes the model code available publicly. As of 10/7/2026 it is behind the analytics version: new features are being added there and will be brought over here in later updates. The `add-tests` branch is the most current (see [Source](#source)).

## Install

The package is not on the npm registry yet. Clone it, build it, then install the folder into your project:

```sh
git clone --branch add-tests https://github.com/UHERO/policy-simulator-package.git
cd policy-simulator-package
npm install
npm run build

# then, from your own project
npm install ../policy-simulator-package
```

Drop `--branch add-tests` to use `main`. Installing straight from GitHub (`npm install github:UHERO/policy-simulator-package`) also works on npm 11 and earlier, but npm 12 blocks git installs and install scripts by default.

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
| `DEFAULT_INPUTS[program]` | each pathway's default assumptions; with no `cap_rate` the model's default is used (the zone's rate on `main`, a flat 5.1% on `add-tests`) |
| `calcSingle(inputs)` | the model: `SliderInputs` in, `ParcelOutput` out |
| `overallLevel(output)` | the feasibility verdict/output |

On `add-tests` only:

| Export | What it is |
| --- | --- |
| `opts` on `calcParcel`, `parcelInputs` and `pathwayEnvelope` | `opts.tier` picks the TOD tier: `base`, `minor_sd`, `major_sd` or `with_benefits` |
| `todIneligibleReason(parcel)`, `todNotApplicableReason(parcel, tier)` | why a TOD parcel can't use the transit permit, or can't have housing at a tier |
| `parking_exempt` on a parcel | Standard, Before Ord. 26-7 and 201H: the parcel needs no off-street parking (§ 21-6.20(a)); otherwise the Article 6 minimum applies |

## Source

The model is copied from `UHERO/analytics`:

| Branch | Analytics commit | Includes |
| --- | --- | --- |
| `main` | `00640ace` (branch `gauge-v10-sakura`, 9/29/26) | The pathways as of that date |
| `add-tests` | `c7d7774b` (branch `gauge-v11-sakura`, 10/9/26) | Adds the TOD permit tiers (PD-T and IPD-T), the open-space bonus, the flat 5.1% cap rate, ground-floor and podium parking, the Article 6 parking minimums with the per-parcel exemption, loading spaces and bicycle parking, the TOD 40 ft front parking rule, the parking breakdown on the output (surface, ground-floor and podium stalls; short- and long-term bicycle spaces), BWS water charges, the loan fee, and the test suite |

| Here | In analytics |
| --- | --- |
| `src/calculations/*.ts` | `app/housing/policy/calculator/calculations/*.ts` (unchanged) |
| `src/feasibility.ts` | `app/housing/policy/shared/feasibility.ts` (import path only) |
| `src/parcels.ts` | the Policy Gauge's pathway rules (`gauge/calculations/calc-*.ts`) and default assumptions (`gauge/dashboard.tsx`), rewritten as one module; results identical to the gauge's for every parcel |

**Note:** the two copies must be kept in sync, make any model change in both places.

## Documentation

The main documentation for model logic can be found in [Policy Simulator Documentation](https://docs.google.com/document/d/1HwELgrw0IncCjsLrZh_BB0OYnBjdNXKX-kQArnLvL5k/edit?usp=sharing). Listed below are further documentation on specific assumptions and data used in the code.
- [Pro-Forma Variables Spreadsheet V2](https://docs.google.com/spreadsheets/d/1qVd_1RI3wjlhwmG2LTzQK0v08qlD47YCn9gULIG-1-4/edit?usp=sharing)
  - A google spreadsheet with the currently used variables and their sources
- [Assumptions Made Tracker](https://docs.google.com/spreadsheets/d/1QqSswndNPDVZwGPuKo3mlO7poFdPswB8rq8TlTXpmyo/edit?gid=0#gid=0)
  - Various notation on the code and assumptions made when creating the policy framework

## Resources
- [Pro Forma Variables Spreadsheet V1](https://docs.google.com/spreadsheets/d/1_sSlavakP_3b8Ssv547RV-63rOuHqrqrIfim9JED3XU/edit?usp=sharing)
  - An older version of the Pro Forma Variables Spreadsheet with all the variables used and their sources
- [201-H Process Summary](https://dbedt.hawaii.gov/hhfdc/files/2023/05/2023-05-18-201H-Process-FINAL.pdf)
  - brief summary on 201-H and its requirements
- [Parcels & Zoning Dashboard](https://cchnl.maps.arcgis.com/apps/webappviewer/index.html?id=96d4994d61cc495fa1a8524b3b116eee)
  - Interactive webviewer for Hawaii's parcels
- [Honolulu Inclusionary Housing Flowchart](https://miro.com/app/board/uXjVJaPZAJQ=/)
  - Helpful Miro board depicting the inclusionary housing policy for Hawaii's housing development
- [Development Flowchart](https://miro.com/app/live-embed/uXjVJDi57jk=/?embedMode=view_only_without_ui&moveToViewport=-2298%2C-1870%2C3822%2C2086&embedId=247174178665)
  - Helpful Miro board outlining the housing development process

## Development

```sh
npm install          # install dev dependencies
npm test             # run the tests (add-tests branch)
npx vitest run -u    # re-record the pinned results after a deliberate change
npm run build        # build dist
```

### Tests

The test suite is on the `add-tests` branch, in `test/`:

- **Snapshots** pin every output of the model for each pathway: its defaults,
  scenarios that exercise its branches (grants, the Bill 7 tax exemption, park
  dedication, retail, impact fees, financing, envelope), and a spread of real
  Oʻahu parcels (every zone, with the smallest, median and largest lot and the
  tallest height) through `calcParcel`. The pinned results live in
  `test/__snapshots__/model.test.ts.snap`, and match the Policy Gauge's results
  exactly.
- **Behaviour checks** that must hold whatever the numbers: the same inputs give
  the same outputs, inputs are never modified, unit counts are whole and
  consistent, and policy rules such as Bill 7's 60 ft cap, park waiver and the
  TOD permit tiers (`model.test.ts`).
- **Calculator** (`calculator.test.ts`): the inputs the Project View builds at
  each pathway's slider defaults, with retail on and off and under each TOD
  regime and tier (`test/data/calculator-defaults.json`). Pins the results,
  checks the Article 6 parking defaults, and checks that the TOD and Max FAR
  envelopes match the Policy Gauge's for the same lot.
- **Gauge** (`gauge.test.ts`): 287 real parcels sampled from the Policy Gauge's
  parcel files (`test/data/gauge-parcels.json`), including TOD parcels in
  every regime, station area and industrial district, PD-T parcels with
  parentheticals, and parcels with and without the § 21-6.20(a) parking
  exemption. Pins the per-parcel results and totals, and checks the rules on
  every parcel: exempt parcels build no stalls and the rest the legal minimum,
  bicycle parking outside industrial zones, no loading on lots of 7,500 sqft or
  less, the PD-T 40 ft front strip, the IMX-1 unit cap, and the TOD status of
  industrial land.

Any change that moves a result fails the snapshot tests, on purpose. If the
change is intended, run `npx vitest run -u`, review the snapshot diff in git
(it shows exactly which outputs moved, and by how much), and commit it with the
change.
