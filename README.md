# @uhero/feasim

A development feasibility model for housing on Oʻahu, from the University of Hawaiʻi Economic Research Organization (UHERO).

Give it a lot (its size, zoning and height limit) and a policy pathway, such as current zoning, Bill 7 or a transit-oriented development (TOD) permit. It works out what a developer could build there, then runs the project's pro forma: units, parking, costs, rents and sales, financing, residual land value and developer returns. It finishes with a verdict: is the project strong, marginal or poor?

Some things you can use it for:

- **Compare pathways for one lot:** Which policy makes a project pencil?
- **Test assumptions:** How do land cost, construction cost, interest rates or a subsidy change the answer?
- **Run many parcels:** Map or total the housing a policy would make feasible across a district or the whole island.

For more information, visit the [Housing Policy Simulator documentation](https://github.com/UHERO/feasim/blob/main/docs/README.md): how the model works, pathway by pathway, and the sources behind its assumptions.

## Install

```sh
npm install @uhero/feasim
```

Or with another package manager: `yarn add @uhero/feasim`, `pnpm add @uhero/feasim` or `bun add @uhero/feasim`.

### Requirements
The package has no runtime dependencies. It runs in Node.js 18 or later, in the browser through any bundler (Vite, webpack, Next.js and so on), and in Bun.

### Imports
The package ships both an ES module and a CommonJS build, so either style works:

```ts
// ES modules / TypeScript
import { calcParcel, overallLevel } from "@uhero/feasim";
```

```js
// CommonJS
const { calcParcel, overallLevel } = require("@uhero/feasim");
```

### TypeScript
Type definitions are included, so there is no `@types` package to install. The main types are `ProgramId`, `SliderInputs` (every input) and `ParcelOutput` (every result).

### Versions
Model updates change results: a new premium, fee or rule moves the numbers even when the API stays the same. Pin the version (`npm install @uhero/feasim@0.2.1`, or an exact version in `package.json`) when you need results that stay put, and read [`CHANGELOG.md`](https://github.com/UHERO/feasim/blob/main/CHANGELOG.md) before upgrading. Run `npm ls @uhero/feasim` to see the installed version.

### From source 
To work on the model itself, clone the repository and see the [Developer guide](docs/development.md):

```sh
git clone https://github.com/UHERO/feasim.git
cd feasim
npm install
npm test
```

## Quick start

```ts
import { calcParcel, overallLevel } from "@uhero/feasim";

// a 20,000 sqft lot zoned BMX-3 with a 150 ft height limit
const parcel = { lot_sqft: 20000, zone_class: "BMX-3", height: 150 };

const result = calcParcel("bill6", parcel);

// results for this lot at the default assumptions (v0.2.1)
result.max_units;     // 112 units
result.dev_roc;       // 0.0597, a 5.97% return on cost
result.rlv_sqft;      // 64.45, residual land value in $ per sqft of lot
overallLevel(result); // "marginal"
```

## Concepts

### Pathways

A pathway is a set of rules a project can be built under. Each pathway sets what can be built on the lot and carries its own default assumptions.

| `program` | Pathway | In brief |
| --- | --- | --- |
| `"bill6"` | [Standard (current zoning)](docs/pathways/bill6.md) | Current zoning, as amended by Ord. 26-7 |
| `"standard"` | [Before Ord. 26-7](docs/pathways/standard.md) | Zoning before Ord. 26-7, for comparison |
| `"bill7"` | [Bill 7](docs/pathways/bill7.md) | Affordable rental housing under ROH Chapter 32, with grants and no required parking |
| `"tod"` | [Transit-oriented development](docs/pathways/tod.md) | PD-T and IPD-T permits near rail stations, with FAR and height bonuses by tier |
| `"h201"` | [HRS § 201H](docs/pathways/h201.md) | State affordable housing exemptions, with at least 51% of units affordable |

***Note:*** the ids are historical. `"bill6"` is current zoning, and `"standard"` is the rules before Ordinance 26-7.

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

With `calcSingle` and `"tod"`, pass a `max_far`, or the model can't run the project without the open-space bonus to compare (see [Open-space bonus](docs/simulator-logic.md#open-space-bonus)). `calcParcel` always passes one.

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

***Note:*** rates are fractions, so `0.058` means 5.8% and money is in dollars.

### The verdict

`overallLevel(result)` scores four metrics:

| Metric | Poor | Marginal | Strong |
| --- | --- | --- | --- |
| Return on cost | more than 1 point below the target | within 1 point | at or above the target |
| Residual land value ÷ land price | under 90% | 90–110% | 110% or more |
| Equity multiple | under 2.0× | 2.0–2.5× | 2.5× or more |
| Levered IRR | under 8% | 8–12% | 12% or more |

The project is **poor** if half or more of the metrics are poor, **strong** if none are poor and at least three of the four are strong, and **marginal** otherwise. `rocLevel`, `rlvLevel`, `equityMultipleLevel` and `irrLevel` give each metric on its own.

## Examples

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
***Note:*** `calcSingle` is the model itself: one flat set of inputs in, one result out. Use it when you want to set the FAR and height yourself instead of taking them from a pathway's rules.

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
