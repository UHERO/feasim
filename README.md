# @uhero/feasim

A development feasibility model for housing on Oʻahu, from the University of Hawaiʻi Economic Research Organization (UHERO).

Give it a lot (its size, zoning and height limit) and a policy pathway, such as current zoning, Bill 7 or a transit-oriented development (TOD) permit. It works out what a developer could build there, then runs the project's pro forma: units, parking, costs, rents and sales, financing, residual land value and developer returns. It finishes with a verdict: is the project strong, marginal or poor?

Some things you can use it for:

- **Compare pathways for one lot:** Which policy makes a project pencil?
- **Test assumptions:** How do land cost, construction cost, interest rates or a subsidy change the answer?
- **Run many parcels:** Map or total the housing a policy would make feasible across a district or the whole island.

**Note:** The model code is in plain TypeScript with no runtime dependencies, so it runs in Node or the browser.

## Install

```sh
npm install @uhero/feasim
```

> Until the first release is on npm, install from source: clone this repo, run `npm install` and `npm run build` in it, then run `npm install /path/to/policy-simulator-package` from your project.

## Quick start

```ts
import { calcParcel, overallLevel } from "@uhero/feasim";

// a 20,000 sqft lot zoned BMX-3 with a 150 ft height limit
const parcel = { lot_sqft: 20000, zone_class: "BMX-3", height: 150 };

const result = calcParcel("bill6", parcel);

// this returns your results for these example fields
result.max_units;     
result.dev_roc;        
result.rlv_sqft;       
overallLevel(result); 
```

## Concepts

### Pathways

A pathway is a set of rules a project can be built under. Each pathway sets what can be built on the lot and carries its own default assumptions.

| `program` | Pathway | What it changes |
| --- | --- | --- |
| `"bill6"` | Standard (current zoning) | The zone's FAR (as set by Ordinance 26-7), lot coverage and height under the Land Use Ordinance, with the Article 6 parking minimums |
| `"standard"` | Before Ord. 26-7 | The FAR and lot coverage rules as they stood before Ordinance 26-7, for comparison |
| `"bill7"` | Bill 7 | An affordable housing pathway in the A, AMX, BMX and Waikiki (Apart, ApartMix) districts, with FAR 4.0 and a 60 ft height cap, construction grants, waived impact fees, and no required parking. Excavation and stepbacks follow the zone |
| `"tod"` | Transit-oriented development | PD-T and IPD-T permits near rail stations (ROH § 21-9.100): FAR and height bonuses by tier, station area plan limits, no required parking |
| `"h201"` | HRS § 201H | Exemptions for affordable housing projects, on current (Ord. 26-7) zoning FAR and lot coverage. The defaults make 51% of units affordable at 80% of area median income (AMI), with market units at 120% AMI; set `affordability` and `affordable_ami` to change that. |

**Note:** the ids are historical. `"bill6"` is current zoning, and `"standard"` is the rules before Ordinance 26-7.

### Parcels

`calcParcel` takes a parcel:

| Field | Required | Meaning |
| --- | --- | --- |
| `lot_sqft` | yes | Lot area, sqft |
| `zone_class` | yes | Zoning district, such as `"A-2"`, `"BMX-3"` or `"I-2"` |
| `height` | yes | Height limit, ft. Use `0` if unknown, and the pathway's default is used. |
| `tmk` | no | An ID such as the tax map key, copied onto the result |
| `parking_exempt` | no | No off-street parking required (ROH § 21-6.20(a)). Applies to `standard`, `bill6` and `h201`. |
| `tod_regime` | TOD | `"pdt"` (in an adopted TOD special district) or `"ipdt"` (elsewhere). Leave it out if the lot can't get a TOD permit. |
| `slu_urban` | TOD | `true` if the lot is entirely in the State Land Use urban district |
| `station_area`, `tod_precinct` | TOD | The rail station area, and `"core"` (within ¼ mile) or `"tiz"` (¼ to ½ mile) |
| `tod_map_bonus_height` | TOD | PD-T: the bonus height in parentheses on the TOD zoning map, ft |

### Assumptions (Levers)

Everything else comes from the pathway's defaults, `DEFAULT_INPUTS[program]`. "Levers" is the name of the third argument of `calcParcel` and `parcelInputs` in `src/parcels.ts`:
`calcParcel(program, parcel, levers = {}, opts = {})`. Change any of them by passing levers as the third argument:

```ts
calcParcel("bill6", parcel, {
  // $ per sqft of lot
  land_cost: 250,
  // construction, $ per sqft of building            
  hard_cost_per_sqft: 500,
  // permanent loan interest rate
  permanent_rate: 0.065,
  // equity share of the construction financing
  equity: 0.35,
  // ground-floor retail, where the zone permits it         
  include_retail: true,      
});
```

**Note:** `height_limit` and `max_far` override the pathway's envelope. Bill 7 still caps height at 60 ft. See the `SliderInputs` type for the full list, with units.

**Note:** every pathway takes 18 months of permitting and 12 of construction, whatever the zone. Set `permitting_months` and `const_months` to change them.

### Input values

The model doesn't check its inputs. A value it doesn't recognize falls back to a default or gives an empty result without an error, so use these exactly:

| Input | Use | If it's wrong |
| --- | --- | --- |
| `program` | `"bill6"`, `"standard"`, `"bill7"`, `"tod"` or `"h201"`, lowercase | Anything else runs `"bill6"` |
| `zone_class` | The district code as the Land Use Ordinance writes it, uppercase: `"A-2"`, `"AMX-3"`, `"BMX-4"`, `"B-2"`, `"I-2"`; Waikiki is `"Apart"` or `"ApartMix"` | `"a-2"` or an unknown code has no FAR, so `calcParcel` builds nothing; with your own `max_far` it builds, but without the zone's coverage and retail rules |
| `affordable_ami`, `market_ami` | `"ami_"` plus a bracket from 10 to 140 in steps of 10, such as `"ami_80"` | Other numbers (`"ami_85"`) are scaled from the 50% row and won't match the published HHFDC limits |
| `unit_type` | `"studio_100"`, `"studio75_1br25"`, `"studio50_1br50"`, `"studio25_1br75"`, `"one_bb_100"`, `"one_br50_2br50"`, `"two_bb_100"` or `"third_each"` | Anything else is treated as all one-bedroom |
| `affordability` (201H) | `0.51` or more | Below 50% + 1 of units, `calcSingle` throws |
| `permanent_rate`, `amort_years` | Above `0` | `0` makes the IRR, equity multiple, profit and ROI `NaN` |
| `grant_type` (Bill 7) | `"post_construct"` (default), `"pre_construct"` or `"none"` | Anything else pays no grant |
| `grant_amount` (Bill 7) | Dollars per unit. Leave it out for the ordinance amount: $50,000 pre-construction; $12,000 post-construction, or $40/sqft for units under 300 sqft | A value you pass applies to every unit, overriding the small-unit rule |
| `grant_units` (Bill 7) | `"all"` (default) or `"affordable"`: the units the pre-construction subsidy pays on. Post-construction always pays on affordable units | Anything else pays on all units |
| `prevailing_wage_premium`, `onsite_labor_share` (Bill 7) | Fractions: the extra cost of on-site labor at prevailing wages (default `0.45`), and on-site labor as a share of hard cost (default `0.25`). Pre-construction runs only | `onsite_labor_share` also caps the subsidy, so setting it too low cuts the subsidy |

With `calcSingle` and `"tod"`, pass a `max_far`, or the model can't run the project without the open-space bonus to compare (see Model notes). `calcParcel` always passes one.

### Results

Every function returns a `ParcelOutput`. Some of its fields:

| Group | Fields |
| --- | --- |
| Building | `max_units`, `buildable_sqft`, `net_residential_sqft`, `net_commercial_sqft`, `height_limit` |
| Units | `affordable_units`, `mkt_rent_units`, `afd_rent_units`, `mkt_sale_units`, `afd_sale_units` |
| Parking | `parking_stalls`, split into `surface_stalls`, `ground_floor_stalls` and `podium_stalls`; `podium_levels`, `loading_spaces`, `bicycle_spaces` |
| Costs | `hard_cost`, `soft_cost` (itemized in `soft_cost_breakdown`: permits, fees, water charges, construction management), `dev_cost`, `total_financing_cost` |
| Bill 7 grants | `pre_construction_subsidy`, `dev_post_grant`; pre-construction runs also report `pw_premium_cost` (prevailing wage cost, included in `hard_cost`), `subsidy_labor_cap` and `subsidy_cap_binds` |
| Income | `egi` (effective gross income), `noi` (net operating income), `gdv` (gross development value) |
| Returns | `dev_roc` (return on cost: stabilized NOI over development cost net of grants, at face value), `dev_levered_irr`, `dev_equity_multiple`, `dev_profit`, `dev_dscr` |
| Land | `rlv` and `rlv_sqft`: the residual land value, or the most a developer could pay for the land and still hit their target return. `rlv_grants_pv` (grants discounted to the land purchase) and `rlv_land_carry` (the discount factor to stabilization) split it: `rlv = (gdv - rlv_selling_costs - rlv_project_cost - rlv_profit) / rlv_land_carry + rlv_grants_pv` |

**Note:** Rates are fractions, so `0.058` means 5.8% and money is in dollars.

### The verdict

`overallLevel(result)` scores four metrics:

| Metric | Poor | Marginal | Strong |
| --- | --- | --- | --- |
| Return on cost | more than 1 point below the target | within 1 point | at or above the target |
| Residual land value ÷ land price | under 90% | 90–110% | 110% or more |
| Equity multiple | under 2.0× | 2.0–2.5× | 2.5× or more |
| Levered IRR | under 8% | 8–12% | 12% or more |

The project is **poor** if half or more of the metrics are poor, **strong** if none are poor and at least three of the four are strong, and **marginal** otherwise. `rocLevel`, `rlvLevel`, `equityMultipleLevel` and `irrLevel` give each metric on its own.

## Some Examples

1. Compare pathways for one lot

```ts
import { calcParcel, overallLevel, type ProgramId } from "@uhero/feasim";

const parcel = { lot_sqft: 20000, zone_class: "BMX-3", height: 150 };

for (const program of ["bill6", "bill7", "h201", "tod"] as ProgramId[]) {
  const r = calcParcel(program, parcel);
  console.log(program, r.max_units, r.dev_roc, overallLevel(r));
}
```

2. Test how sensitive a result is to land cost

```ts
for (const land_cost of [100, 200, 300]) {
  const r = calcParcel("bill6", parcel, { land_cost });
  console.log(land_cost, overallLevel(r));
}
```

3. Run many parcels

```ts
const results = parcels.map((p) => calcParcel("tod", p));
const feasibleUnits = results
  .filter((r) => overallLevel(r) === "strong")
  .reduce((sum, r) => sum + r.max_units, 0);
```

4. Change TOD permit tiers, the fourth argument picks the tier: `"base"`, `"minor_sd"`, `"major_sd"` or `"with_benefits"`

```ts
import { calcParcel, todIneligibleReason } from "@uhero/feasim";

const site = {
  lot_sqft: 20000, zone_class: "BMX-3", height: 150,
  tod_regime: "pdt", slu_urban: true, tod_precinct: "core",
} as const;

// null if the lot can use a TOD permit
todIneligibleReason(site);  
calcParcel("tod", site, {}, { tier: "with_benefits" });
```

5. A hypothetical lot, with no parcel.
**Note:** `calcSingle` is the model itself: one flat set of inputs in, one result out. Use it when you want to set the FAR and height yourself instead of taking them from a pathway's rules.

```ts
import { calcSingle, DEFAULT_INPUTS } from "@uhero/feasim";

calcSingle({
  ...DEFAULT_INPUTS.bill6,
  lot_sqft: 10000, zone_class: "A-2", height_limit: 40, max_far: 3.0,
});
```

## API

| Export | What it does |
| --- | --- |
| `calcParcel(program, parcel, levers?, opts?)` | Run a parcel under a pathway. `opts.tier` sets the TOD tier. |
| `parcelInputs(program, parcel, levers?, opts?)` | The full set of inputs `calcParcel` would run, without running it |
| `pathwayEnvelope(program, parcel, opts?)` | The height limit and FAR a pathway gives a parcel |
| `calcSingle(inputs)` | The model: `SliderInputs` in, `ParcelOutput` out |
| `DEFAULT_INPUTS[program]` | Each pathway's default assumptions |
| `overallLevel(result)` | The verdict: `"strong"`, `"marginal"` or `"poor"` |
| `todIneligibleReason(parcel)`, `todNotApplicableReason(parcel, tier)` | Why a lot can't use a TOD permit, or can't have housing at a tier |

The package also exports the rules behind the model, such as the zoning FAR tables, the TOD rules, the parking and loading requirements, and the water charges, for use in your own calculations. Their TypeScript types document each one.

## Model notes

- The model is for only for Oahu as of 10/12/2026.
  - The zoning, fees, rents, sale prices and costs are for the City and County of Honolulu.
- Every pathway is rental by default
  - The defaults are 100% rental. Set `rental_split` and `sale_split` to model for-sale units in later versions.
- The model is designed to be a first pass feasibility screen, not an appraisal
  - The model estimates whether a typical project could pencil, it does not design a specific building.
- The open-space FAR bonus is optional
  - Where a zone offers one (B-2, BMX-3, BMX-4), `calcSingle` runs the project with and without it and keeps the one with the higher residual land value, or the bigger building when neither pencils. The bonus costs 1 sqft of public open space per 5 sqft of extra floor area, so it often isn't worth it on lower buildings. `open_space_bonus` on the result is the bonus taken.
- Bill 7's pre-construction subsidy comes with prevailing wages
  - ROH § 32-5.2(c)(3) lets the subsidy pay only prevailing wages to every on-site worker under HRS Chapter 104. The model counts 25% of hard cost as on-site labor, charges a 45% premium on it (11.25% of hard cost), and caps the subsidy at that labor at prevailing wages. The 25% comes from the 2022 Economic Census for Hawaiʻi (DBEDT State Data Book, Tables 21.05–21.06). The 45% is the median across 11 building trades of DLIR prevailing rates (basic plus fringe, Bulletin 509, September 2025) over the BLS median wage for Urban Honolulu (OEWS, May 2025) plus 30% for open-shop benefits. The post-construction grant (§ 32-4.2) has no wage condition.

The model's logic and data sources are documented here:

- [Policy Simulator Documentation](https://docs.google.com/document/d/1HwELgrw0IncCjsLrZh_BB0OYnBjdNXKX-kQArnLvL5k/edit?usp=sharing): how the model works
- [Pro-Forma Variables Spreadsheet V2](https://docs.google.com/spreadsheets/d/1qVd_1RI3wjlhwmG2LTzQK0v08qlD47YCn9gULIG-1-4/edit?usp=sharing): the variables in use and their sources
- [Assumptions Made Tracker](https://docs.google.com/spreadsheets/d/1QqSswndNPDVZwGPuKo3mlO7poFdPswB8rq8TlTXpmyo/edit?gid=0#gid=0): assumptions made in building the policy framework

Background reading:

- [201-H Process Summary](https://dbedt.hawaii.gov/hhfdc/files/2023/05/2023-05-18-201H-Process-FINAL.pdf): 201H and its requirements
- [Parcels & Zoning Dashboard](https://cchnl.maps.arcgis.com/apps/webappviewer/index.html?id=96d4994d61cc495fa1a8524b3b116eee): an interactive map of Oʻahu's parcels
- [Honolulu Inclusionary Housing Flowchart](https://miro.com/app/board/uXjVJaPZAJQ=/)
- [Development Flowchart](https://miro.com/app/live-embed/uXjVJDi57jk=/?embedMode=view_only_without_ui&moveToViewport=-2298%2C-1870%2C3822%2C2086&embedId=247174178665): the housing development process
- [Pro Forma Variables Spreadsheet V1](https://docs.google.com/spreadsheets/d/1_sSlavakP_3b8Ssv547RV-63rOuHqrqrIfim9JED3XU/edit?usp=sharing): the older version, with every variable and its source

## Development

```sh
npm install          # install dev dependencies
npm test             # run the tests
npx vitest run -u    # re-record the pinned results after a deliberate change
npm run build        # build dist
```

### Tests

The tests are in `test/`:

- **`model.test.ts`** pins every output of the model for each pathway: its defaults, scenarios that exercise its branches (grants, the Bill 7 tax exemption, park dedication, retail, impact fees, financing, the envelope), and a sample of Oahu parcels (every zone, with the smallest, median and largest lot and the tallest height). It also checks rules that must hold whatever the numbers. For example, the same inputs give the same outputs, inputs are never modified, unit counts are whole and consistent, and policy rules such as Bill 7's 60 ft cap, its park waiver and the TOD permit tiers.
- **`calculator.test.ts`** runs single hypothetical lots through `calcSingle` (`test/data/calculator-defaults.json`): each pathway's defaults, with retail on and off and under each TOD regime and tier. It checks the Article 6 parking defaults, and that the FAR and height match what `pathwayEnvelope` gives the same lot.
- **`gauge.test.ts`** runs 287 Oahu parcels through `calcParcel` (`test/data/gauge-parcels.json`), including TOD parcels in every regime, station area and industrial district, PD-T parcels with bonus heights, and parcels with and without the parking exemption. It pins the per-parcel results and totals, and checks the rules on every parcel: exempt parcels build no stalls and the rest the legal minimum, bicycle parking outside industrial zones, no loading on lots of 7,500 sqft or less, the PD-T 40 ft front strip, the IMX-1 unit cap, and the TOD status of industrial land.

Any change that moves a result fails the snapshot tests, on purpose. If the change is intended, run `npx vitest run -u`, review the snapshot diff in git, and commit it with the change.

### Commits and releases

Releases are automated with [release-please](https://github.com/googleapis/release-please). It reads the commit messages on `main` and opens a release PR that bumps the version in `package.json` and updates `CHANGELOG.md`. Merging that PR creates the GitHub Release and publishes the package to npm. Don't bump the version by hand.

For this to work, write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/) format: `type: short description`.

| Prefix | Use for | Release |
| --- | --- | --- |
| `fix:` | a bug fix | patch (0.2.0 → 0.2.1) |
| `feat:` | a new feature | minor (0.2.0 → 0.3.0) |
| `feat!:`, `fix!:`, or a `BREAKING CHANGE:` footer | a change that breaks existing users | major (0.2.0 → 1.0.0) |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:` | everything else | no release on their own |

Examples: `feat: add pre-construction premiums`, `fix: correct the Bill 7 height cap`.

- The bump is the highest level among the commits since the last release. Messages with no prefix are ignored, so they never trigger a release.
- If a PR is squash-merged, the PR title becomes the commit message on `main`, so give the PR title the prefix.
- Before version 1.0.0, release-please bumps more conservatively: a breaking change gives a minor bump and a `feat:` gives a patch bump.
- To force a specific version, add `Release-As: 1.0.0` as a footer in a commit message.

### Where the model comes from

UHERO's Policy Simulator dashboard is one application built on this model. Its source is in UHERO's private analytics repository, and this package is the public copy.

| Here | In `UHERO/analytics` |
| --- | --- |
| `src/calculations/*.ts` | `app/housing/policy/calculator/calculations/*.ts` (unchanged, except that the output also returns `soft_cost_breakdown`) |
| `src/feasibility.ts` | `app/housing/policy/shared/feasibility.ts` (import path only) |
| `src/parcels.ts` | The Policy Gauge's pathway rules (`gauge/calculations/calc-*.ts`) and default assumptions (`gauge/dashboard.tsx`), as one module; identical results for every parcel |

**Note:** Currently copied from analytics commit `c7d7774b` (branch `gauge-v11-sakura`, 10/9/26). Until analytics uses this package directly, make any model change in both places.