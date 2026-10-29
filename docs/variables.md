# Variables

Every input, constant and calculation function in the model, grouped by what it does. Values are as of the current code; where this page and the code disagree, the code is right. Files are in `src/calculations/` except `parcels.ts` and `feasibility.ts`, which are in `src/`. How each piece is used is in [Housing Policy Simulator logic](simulator-logic.md), and each pathway's defaults are on its [pathway page](README.md#pathways).

**Review** is how often the value should be checked against its source.

## Contents

- [Levers](#levers)
- [Zones](#zones)
- [Park dedication](#park-dedication)
- [Construction](#construction)
- [Units](#units)
- [FAR and density](#far-and-density)
- [Building envelope](#building-envelope)
- [TOD](#tod)
- [Vacancy](#vacancy)
- [Affordability](#affordability)
- [Soft costs](#soft-costs)
- [BWS water charges](#bws-water-charges)
- [Timing](#timing)
- [Financing](#financing)
- [Hold strategy](#hold-strategy)
- [Cap rates](#cap-rates)
- [Car parking](#car-parking)
- [Loading](#loading)
- [Bicycle parking](#bicycle-parking)
- [Other income](#other-income)
- [Operating expenses](#operating-expenses)
- [Bill 7](#bill-7)
- [Pathway fallback constants](#pathway-fallback-constants)
- [Feasibility](#feasibility)
- [Defined but not used](#defined-but-not-used)

## Levers

Levers are user inputs. The default for each pathway is set in `DEFAULT_INPUTS` (`src/parcels.ts`) and listed on each pathway page under Default assumptions.

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `amort_years` | Lever | 30 | Permanent loan amortization period; developer interviews indicate 30 years is typical. Fallback is `HOLD.amort_years`. |  |  | parcels.ts |
| `land_cost` | Lever | 130 | Market price of land, $ per sq ft of lot. Feeds the deal-basis loan, return on cost, the park in-lieu fee and the RLV ratio. |  |  | parcels.ts |
| `target_return` | Lever | 0.115 | Land carry rate: annual cost of capital on the land purchase, used to discount the residual in calcDevRLV. The required ROC is now cap rate + target_spread (see DEFAULT_TARGET_SPREAD). |  |  | parcels.ts |
| `unit_type` | Lever | one_bb_100 (Bill 7: studio50_1br50) | Unit mix key into UNIT_MIX (e.g. one_bb_100, studio50_1br50), no longer a single unit size. |  |  | parcels.ts |
| `park` | Lever | in_lieu (Bill 7: exempt) | Park dedication: "exempt" (application fee only) or "in_lieu" (fee + fair market value of the park land). No longer a yes/no boolean. Bill 7 waives it (ROH 43-10.8) unless in_lieu is chosen to show the waiver's worth. | ROH 22-7.7; ROH 43-10.8 |  | parcels.ts |
| `floor_height` | Lever | 10 | Floor-to-floor height, ft. Floors = floor(height_limit ÷ floor_height). |  |  | parcels.ts |
| `grant_type` | Lever | post_construct | Bill 7 only: "none", "pre_construct" ($50,000 per unit, paid evenly over the construction months) or "post_construct" ($12,000 per affordable unit, paid when construction ends). The amount comes from `grant_amount` or `GRANT`. | ROH chp 32 article 4 & 5 |  | parcels.ts |
| `retail_rent` | Lever | 5 (Bill 7: 3) | Ground-floor retail rent, $/sq ft/month; developer interviews indicate Hawaiʻi retail runs $3–12/sq ft/month. Only used when `include_retail` is true and the zone permits ground-floor commercial. |  |  | parcels.ts |

## Zones

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `ZONE_GROUPS` | Table |  | lowDensity: A-1, AMX-1, R-5 (FAR, Ord. 26-7 FAR, excavation depth). mixedUse: AMX-1/2/3, BMX-3/4, ApartMix (ground-floor commercial permitted). waikiki: Apart, ApartMix (Waikiki Special District Apartment Precinct and Apartment Mixed Use Subprecinct). | ROH 21-3; ROH 21-9.80; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `ZONE_NAMES` | Table | 2 entries | Official names for shorthand zone codes: Apart = Apartment Precinct, ApartMix = Apartment Mixed Use Subprecinct. |  |  | calc-shared.ts |
| `zoneName` | Function |  | Returns the official district name for a zone code. |  |  | calc-shared.ts |
| `permitsGroundFloorRetail` | Function |  | True when the zone is in ZONE_GROUPS.mixedUse. | ROH Table 21-3.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `INDUSTRIAL` | Table | 4 zones | I-1, I-2, I-3, IMX-1. No bicycle parking required; residential only via TOD (see residentialUse). | ROH Table 21-5.1; ROH 21-6.40(a); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `APARTMENT_ZONES` | Table | 6 zones | A-1/2/3, AMX-1/2/3. Get the tiered lot coverage (lotCoverage) and Ord. 26-7's flat 60% (lotCoverageBill6). | ROH Table 21-3.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |

## Park dedication

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `PARK_SQFT_PER_UNIT` | Constant | 110 | Apartment, resort, and mixed use districts: 110 square feet per dwelling or lodging unit. Does not apply to affordable units under Chapter 29, PD-T affordable units, HRS 201H-36(a)(5) rentals, or Chapter 32 rentals at <=100% AMI. Note: the code comment calls the park constants unused, but calcParkArea reads this one. | ROH 22-7.5 Land area required for parks and playgrounds.; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-23898#JD_22-7.5) | 5 Years | calc-shared.ts |
| `PARK_FLOOR_AREA_FRACTION` | Constant | 0.1 | Multiple family dwelling: 10 percent of the maximum permitted floor area or 110 square feet per dwelling or lodging unit, whichever is less. Now applied to every pathway through calcParkArea, not only special districts. | ROH 22-7.5 Land area required for parks and playgrounds.; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-23898#JD_22-7.5) | 5 Years | calc-shared.ts |
| `calcParkArea` | Function |  | Park land = min(110 sq ft x chargeable units, 10% x buildable sq ft). Chargeable units = market units; ROH 22-7.3(j)(1) exempts Ch. 29 affordable units. In-lieu fee = FEES.park_dedication.in_lieu + park area x land_cost. | ROH 22-7.5; ROH 22-7.3(j)(1); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-23898#JD_22-7.5) | 5 Years | calc-shared.ts |

## Construction

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `hard_cost_per_sqft` | Lever | 450 | Residential hard cost, $ per gross sq ft, one rate for every zone. Replaces the zone lookup COST_PER_ZONE. |  | Yearly | parcels.ts |
| `RETAIL_PREMIUM` | Constant | 15 | **xyz** assumes that retail construction cost rate is $15 more than the residential construction cost rate. Retail rate = hard_cost_per_sqft + 15. | **xyz** |  | calc-shared.ts |
| `EFFICIENCY` | Constant | 0.8 | **xyz** assumes 80% gross-to-net efficiency (the rest is corridors, stairs, elevators, mechanical, lobby). | **xyz** |  | calc-shared.ts |
| `CONSTRUCTION_MGMT_RATE` | Constant | 0.03 | Construction management fee, arbitrary 3% of hard costs. Charged as a soft cost line in calcSoftCosts. |  |  | calc-shared.ts |
| `contingency` | Constant | 1.1 | **xyz** assumes 10% of hard costs for contingency. Stored as a multiplier: total dev cost = hard cost x 1.1 + soft cost. | **xyz** |  | calc-shared.ts |
| `cost_inflation` | Constant | 1.056 | 5.6%/yr construction hard-cost escalation, applied from today to the construction midpoint: hard cost x 1.056^((permitting + const/2)/12). Replaces **xyz**'s flat 3% inflation. |  | Yearly | calc-shared.ts |
| `drawCurve` | Function |  | S-curve for construction loan draws: cumulative share drawn = 3t^2 - 2t^3 at progress t (0-1). |  |  | calc-shared.ts |
| `setback` | Lever | 10 | Yard setback on every side, ft. The lot is modeled as 2:1 depth:width fronting its short side. |  | 5 Years | parcels.ts |

## Units

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `DEFAULT_UNIT_TYPE` | Constant | one_bb | Default unit type is one bed one bath. Fallback for rent lookups and unit_type. |  |  | calc-shared.ts |
| `UNIT_SIZE` | Table | studio 300, one_bb 500, two_bb 700, three_bb 900, four_bb 1200 | Unit sizes by type, sq ft. Affordable housing maximum unit size requirements. | ROH 32-2.9; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-37223#JD_32-2.9) | 5 Years | calc-shared.ts |
| `UNIT_MIX` | Table | 8 presets | Unit mix presets; each maps to unit types and weights summing to 1: studio_100, studio75_1br25, studio50_1br50, studio25_1br75, one_bb_100, one_br50_2br50, two_bb_100, third_each. |  |  | calc-shared.ts |
| `mixUnitSize` | Function |  | Blended average unit size for a mix key (falls back to one_bb_100, and 500 sq ft for an unknown type). |  |  | calc-shared.ts |

## FAR and density

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `calcFAR` | Function |  | Lot-size-scaled FAR formulas for A/AMX (pre-Ord. 26-7 Table 21-3.3), Waikiki Apart/ApartMix, Resort, Industrial (I-1 1.0, I-2/I-3 2.5, IMX-1 1.5), B-1 1.0, B-2/BMX-3 2.5, BMX-4 4.0. Used by Before Ord. 26-7. | ROH 21-3.90-1: Table 21-3.3, Table 21-3.4, Table 21-3.5, Table 21-9.6(B); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `baseFar` | Function |  | Base FAR by district: Table 21-3.3 flat figures (calcFarBill6) for the apartment districts, calcFAR for the rest. Used by TOD. | ROH Table 21-3.3; Table 21-3.4; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `calcFarBill6` | Function |  | Ord. 26-7 FAR, apartment districts only: low density 2.0, A-2/AMX-2 3.0, A-3/AMX-3/Waikiki 4.0. Business districts keep `BUSINESS_FAR`. Used by Standard and 201H. | Ord. 26-7 | 5 Years | calc-shared.ts |
| `BUSINESS_FAR` | Table | 4 entries | ROH Table 21-3.4 base FAR: B-1 1.0, B-2 2.5, BMX-3 2.5, BMX-4 4.0. | ROH Table 21-3.4; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `TABLE_21_3_3` | Table | 6 zones | Districts that take baseFar from calcFarBill6: A-1, AMX-1, A-2, AMX-2, A-3, AMX-3. | ROH Table 21-3.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `LOT_COVERAGE` | Table |  | Maximum building area by zone: A-1/AMX-1/R-5 0.6, A-2/AMX-2 0.5, A-3/AMX-3 0.4, B-1/B-2/BMX-3/BMX-4 1.0 (not regulated), Apart/ApartMix 1.0 (podium). Fallback 0.6. | ROH 21-3.90-1: Table 21-3.3, Table 21-3.4, Table 21-9.6(B); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `lotCoverage` | Function |  | Apartment zones get tiered coverage by lot size: <7,500 sq ft 0.6, <=20,000 sq ft 0.5, larger 0.4. Others use LOT_COVERAGE. | ROH Table 21-3.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `lotCoverageBill6` | Function | 0.6 | Ord. 26-7 replaced the tiers with a flat 60% in apartment zones. | Ord. 26-7 | 5 Years | calc-shared.ts |
| `COMMERCIAL_COVERAGE` | Table | 0.3 / 0.4 / 0.6 | Ground floor commercial as a share of lot area (AMX/BMX): commercial1 0.3, commercial2 0.4, commercial3 0.6. | ROH Table 21-3.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `commercialFracByZone` | Function |  | AMX-1 commercial1, AMX-2 commercial2, AMX-3/BMX-3/BMX-4/ApartMix commercial3, else 0. | ROH Table 21-3.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-19614#JD_Table21-3.3) | 5 Years | calc-shared.ts |
| `DEFAULT_RETAIL_SHARE` | Constant | 0.1 | Ground-floor retail share of the floor plate (retail_share lever fallback). |  |  | calc-shared.ts |
| `WAIKIKI_OPEN_SPACE` | Table | low_far 0.35, high_far 0.5, far_threshold 1.5 | Waikiki precincts keep open space: 35% of the lot below FAR 1.5, 50% at FAR 1.5+. Coverage and open space don't stack; envelopeCoverage takes the stricter. | ROH 21-9.80 | 5 Years | calc-shared.ts |
| `envelopeCoverage` | Function |  | Effective coverage = min(coverage, 1 - Waikiki open-space share). |  |  | calc-shared.ts |
| `OPEN_SPACE_FAR_CEILING` | Table | 3.5 / 3.5 / 7.5 | Open-space bonus FAR ceilings; the bonus is the gap from base FAR: B-2 3.5, BMX-3 3.5, BMX-4 7.5. | ROH 21-3.120-2(c) | 5 Years | calc-shared.ts |
| `openSpaceBonus` / `openSpaceBonusOver` | Function |  | Largest open-space bonus the district allows over base FAR / over a pathway's own FAR. Applied by Standard, Before Ord. 26-7, 201H and IPD-T. | ROH 21-3.120-2(c) |  | calc-shared.ts |
| `lotAfterOpenSpace` | Function |  | Public open space for the bonus is earned at 5:1, so 1.0 FAR of bonus gives up lot_sqft/5 of ground. | ROH 21-3.120-2(b) |  | calc-shared.ts |
| `BILL7_FAR` | Constant | 4 | Bill 7 statutory FAR. | ROH 32 | Yearly | parcels.ts |
| `BILL7_MAX_HEIGHT` | Constant | 60 | Bill 7 height cap, ft. Applied in parcelInputs on top of any height lever. | ROH 32 | Yearly | parcels.ts |
| Bill 7 lot coverage (coverage) | Inline constant | 0.8 | Bill 7's own 80% maximum building area; overridable with the coverage lever. | ROH 32 | Yearly | calc-bill7.ts |

## Building envelope

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `yardFootprint` | Function |  | Footprint inside front, rear and side yards on a 2:1 depth:width lot fronting its short side. |  |  | calc-shared.ts |
| `STEPBACK_ABOVE_40` | Table | 8 zones | Zones with a height setback above 40 ft (1 ft per 10 ft of height): A-2, A-3, AMX-2, AMX-3, B-2, BMX-3, BMX-4 (takes the BMX-3 rule), IMX-1. | ROH 21-3.80-1(c); 21-3.90-1(c); Ord. 17-55; 21-3.100-1(c) | 5 Years | calc-shared.ts |
| `zoneStepBack` | Function |  | Step-back by zone: STEPBACK_ABOVE_40 zones trigger at 40 ft; Resort at 30 ft; Waikiki at 40 ft including the front yard. Overridden by the stepback_* levers. | ROH 21-3.80-1(c); 21-9.80-5(c) | 5 Years | calc-shared.ts |
| `floorPlates` | Function |  | Floor plate of each storey (ground first): min(coverage plate, yard footprint widened by the step-back). |  |  | calc-shared.ts |
| `podiumEnvelope` | Function |  | Fits units, retail, surface/ground-floor/podium parking, loading and bicycle parking into the floor plates. Parking counts toward height, not FAR. Tries a surface lot first, then the podium height that yields the most units. |  |  | calc-shared.ts |
| `livingStories` | Function |  | Residential stories built = residential floor area / floor plate (drives the WSFC rate and fire meter size). |  |  | calc-shared.ts |

## TOD

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `TOD_ELIGIBLE_DISTRICTS` | Table | 17 zones | Districts eligible for IPD-T: A-1/2/3, AMX-1/2/3, B-1, B-2, BMX-3/4, Resort, ResCom, ResMix, I-1/2/3, IMX-1. | ROH 21-9.100-5(b)(5) | 2 Years | calc-shared.ts |
| `TOD_MIN_LOT_SQFT` | Constant | 20000 | Single-lot minimum project size for PD-T/IPD-T approval (minor/major special district permits have none). | ROH 21-9.100-5(b)(3); 21-9.100-10(a)(1) | 2 Years | calc-shared.ts |
| `TOD_MAX_FAR` | Constant | 7.5 | IPD-T FAR cap. | ROH 21-9.100-5(e) | 2 Years | calc-shared.ts |
| `TOD_MAX_HEIGHT_FT` | Constant | 450 | IPD-T height cap where no plan exists: 2x the underlying limit or 450 ft, whichever is lower. | ROH 21-9.100-5(e)(2) | 2 Years | calc-shared.ts |
| `calcFarTod` | Function |  | IPD-T FAR = 2 x base + open-space bonus (2 x (base + bonus) for DOUBLE_AFTER_BONUS zones), capped at 7.5; a higher station-area plan FAR replaces it. | ROH 21-9.100-5(e)(1) | 2 Years | calc-shared.ts |
| `DOUBLE_AFTER_BONUS` | Table | 4 zones | Zones where FAR doubles after the open-space bonus: B-2, BMX-3, BMX-4, IMX-1. | ROH 21-9.100-5(e)(1)(C) | 2 Years | calc-shared.ts |
| `todUseZone` | Function |  | IPD-T imports BMX-3 uses into every district but BMX-4. | ROH 21-9.100-5(d)(1) |  | calc-shared.ts |
| `calcFarPdt` | Function |  | PD-T FAR ladder: BMX-3/B-2 PD-T 7.0, minor/major permit 3.5; PDT_SCALED zones (A, AMX, I, IMX-1) 2.0x base with PD-T, 1.2x with a permit; B-1, BMX-4, resort no uplift. | ROH 21-9.100-8(a)(1)(A) | 2 Years | calc-shared.ts |
| `PDT_SCALED` | Table | 10 zones | Zones on the scaled PD-T FAR ladder: A-1/2/3, AMX-1/2/3, I-1/2/3, IMX-1. | ROH 21-9.100-8(a)(1)(A) | 2 Years | calc-shared.ts |
| `todHeightPdt` | Function |  | PD-T heights: minor permit min(base + 60, 2x base); major permit min(base + 120, 3x base); both capped at the map's parenthetical bonus height; PD-T approval reaches the parenthetical, or the major height where the map shows none. | ROH 21-9.100-8(a)(1)(D) | 2 Years | calc-shared.ts |
| `todHeightLimit` | Function |  | IPD-T height: the plan's height where one exists (a higher zoned height prevails), else min(2x base, 450 ft). | ROH 21-9.100-5(e)(2) | 2 Years | calc-shared.ts |
| `IMX1_PDT_MAX_UNITS` | Constant | 10 | IMX-1 under PD-T: up to 10 dwellings per zoning lot above the ground floor, with a special district permit. | ROH 21-9.100-7(c) | 2 Years | calc-shared.ts |
| `residentialUse` | Function |  | Industrial zones: housing permitted under IPD-T (BMX-3 uses imported); under PD-T only IMX-1, discretionary. | ROH Table 21-5.1; 21-9.100-5(d)(1); 21-9.100-7(c) |  | calc-shared.ts |
| `TOD_PLAN_STANDARDS` | Table | 8 station areas | Station-area plan ceilings (core <=1/4 mi / TIZ 1/4-1/2 mi). Ala Moana core FAR 10.0 / 400 ft, TIZ 7.0 / 350 ft; Downtown core 7.5 / 400 ft, TIZ 4.5 / 250 ft (both quarter-mile proxy); Kalihi heights only (200 / 150 ft, FAR not transcribed); Airport, East Kapolei, Waipahu, Aiea-Pearl City, Halawa null (base height, per-parcel map, or PD-T ladder). | Ala Moana Neighborhood TOD Plan Figs. 5-3/5-4; Downtown Neighborhood TOD Plan Figs. 2-6/2-7; Kalihi Neighborhood TOD Plan Fig. 2-7 | 2 Years | calc-shared.ts |
| `todPlanCeiling` | Function |  | Looks up a station area's FAR and height ceilings for a precinct. |  |  | calc-shared.ts |
| `PDT_FRONT_NO_PARKING_FT` | Constant | 40 | No at-grade or ground-floor parking within this many feet of the front lot line in a TOD special district. | ROH 21-9.100-8(c)(1) | 2 Years | calc-shared.ts |
| `frontStripSqft` | Function |  | Ground inside the yards within the no-parking depth of the front lot line. | ROH 21-9.100-8(c)(1) |  | calc-shared.ts |
| `todIneligibleReason` / `todNotApplicableReason` | Function |  | Eligibility gates (regime, district, 20,000 sq ft minimum, State Land Use urban) and IMX-1 housing permits. | ROH 21-9.100-5(b); Table 21-9.8 |  | parcels.ts |
| `TodTier` | Type |  | Permit tiers: base, minor_sd, major_sd, with_benefits (PD-T or IPD-T approval). Minor and major are PD-T only. |  |  | parcels.ts |
| `pathwayEnvelope` | Function |  | A pathway's height limit and FAR for a parcel: TOD tier rules; Bill 7 FAR 4.0 and 60 ft; Standard and 201H `calcFarBill6`; Before Ord. 26-7 `calcFAR`; each with the open-space bonus where allowed. |  |  | parcels.ts |

## Vacancy

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `default` | Constant | 0.126 | Applied to retail PGI. | [DBEDT](https://files.hawaii.gov/dbedt/economic/reports/hawaii_housing_demand_2024_final.pdf); [FRED](https://fred.stlouisfed.org/series/HIRVAC) | Yearly | calc-shared.ts |
| `rental` | Constant | 0.074 | Applied to residential PGI. | [DBEDT](https://files.hawaii.gov/dbedt/economic/reports/hawaii_housing_demand_2024_final.pdf); [FRED](https://fred.stlouisfed.org/series/HIRVAC) | Yearly | calc-shared.ts |

## Affordability

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `AFFORDABLE_RENT_INCOME_SHARE` | Constant | 0.3 | Affordable rent = 30% of household income, utilities included (HHFDC guideline). | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `INCOME_LIMITS` | Table | 14 AMI rows x 8 sizes | 2025 HHFDC Honolulu County income schedule by family size 1-8, 10%-140% AMI (median $129,300). | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `RENT_HOUSEHOLD` | Table | 5 entries | Household sizes averaged for each unit type's rent: studio [1], one_bb [1,2], two_bb [3], three_bb [4,5], four_bb [6]. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | 5 Years | calc-shared.ts |
| `rentByAmi` | Function |  | Monthly affordable rent from INCOME_LIMITS (no longer a linear regression): average income for the unit's household sizes x 30% / 12, floored. Unpublished AMI brackets scale the 50% row linearly. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `mixRentByAmi` | Function |  | Weighted rent across a unit mix. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) |  | calc-shared.ts |
| `HHFDC_RATES` | Table | 15 rates | Mortgage rates the HHFDC sale price tables are published at: 4.00%-7.50% in 0.25% steps. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `HHFDC_0BR` | Table | 15 rates x 10 AMI | HHFDC affordable sale prices by mortgage rate x AMI (50%-140%). Only reached when a pathway builds sale units; every pathway currently builds 0. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `HHFDC_1BR` | Table | 15 rates x 10 AMI | HHFDC affordable sale prices by mortgage rate x AMI (50%-140%). Only reached when a pathway builds sale units; every pathway currently builds 0. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `HHFDC_2BR` | Table | 15 rates x 10 AMI | HHFDC affordable sale prices by mortgage rate x AMI (50%-140%). Only reached when a pathway builds sale units; every pathway currently builds 0. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `HHFDC_3BR` | Table | 15 rates x 10 AMI | HHFDC affordable sale prices by mortgage rate x AMI (50%-140%). Only reached when a pathway builds sale units; every pathway currently builds 0. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `HHFDC_4BR` | Table | 15 rates x 10 AMI | HHFDC affordable sale prices by mortgage rate x AMI (50%-140%). Only reached when a pathway builds sale units; every pathway currently builds 0. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `HHFDC_TABLES` | Table | 5 entries | Look up table: unit type -> HHFDC_nBR. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) |  | calc-shared.ts |
| `getAffordablePrice` | Function |  | HHFDC affordable sale price lookup: AMI rounded to the nearest 10% (min 50%), closest published rate. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) |  | calc-shared.ts |
| `mixAffordablePrice` | Function |  | Weighted sale price across a unit mix. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) |  | calc-shared.ts |
| `ami_escalation` | Constant | 1.04 | 4%/yr AMI growth (2015–2026 Honolulu MFI CAGR). Escalates AMI-based rents, affordable and market, over the permitting, construction and lease-up months. |  | Yearly | calc-shared.ts |
| `affordable_ami` / `market_ami` | Lever | ami_80 / ami_120 (Bill 7: ami_80 / ami_100) | AMI level for affordable and market rents (market rent is modeled as a high-AMI rent). |  |  | parcels.ts |
| Affordable set-aside: Before Ord. 26-7 / `Standard` / `TOD` | Inline constant | 0 | 0 affordable units. The old 5% rental / 15% sale (TOD 15% / 30%) set-asides are commented out (8/26/2026: for-sale discarded, deferred to Chapter 29). | ROH Chp 29 | 5 Years | calc-standard.ts, calc-bill6.ts, calc-tod.ts |
| Affordable set-aside: Bill 7 | Inline constant | 0.8 | ceil(80% of units) are affordable rentals; no sale units. | ROH 32 | Yearly | calc-bill7.ts |
| `affordability` | Lever | 0.51 | 201H: share of units affordable (all rental). | HRS 201H | 5 Years | parcels.ts |
| `H201_MIN_AFD_FRAC` | Constant | 0.5 | 201H needs at least floor(units x 0.5) + 1 affordable units, or the model returns a validation error. | HRS 201H | 5 Years | calc-h201.ts |

## Soft costs

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `specialDistrictFee` | Function |  | Special district processing fee: $800 + $300 per acre (acres round up at .45), max $15,000. TOD only. | ROH 6-41.1(a)(4); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-4823) | 5 Years | calc-shared.ts |
| `specialDistrictTotal` | Function |  | $400 + specialDistrictFee. TOD only. | ROH 6-41.1(a)(4); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-4823) | 5 Years | calc-shared.ts |
| `tod_application` | Constant | 15000 | $15,000 on two different checks. TOD only. | [City](https://www.honolulu.gov/tod/wp-content/uploads/sites/73/2025/03/PD-T-instructions.pdf) | 2 Years | calc-shared.ts |
| `buildingPermitFee` | Function |  | Table 18-A on construction value per unit (hard cost / units), times chargeable units (waivable_fee_basis). | ROH 18-7.5; Table 18-A; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-17450) | 5 Years | calc-shared.ts |
| `planReviewFee` | Function |  | 10% of the building permit fee, min $200, max $25,000, times chargeable units. | ROH 18-6.1; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-17338) | 5 Years | calc-shared.ts |
| `temp_occupancy_cert` | Constant | 200 | Temporary certificate of occupancy fee. | Table 18-A; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-17450) | 5 Years | calc-shared.ts |
| `exempt` / `in_lieu` | Constant | 0 / 200 | Park dedication application fee: exempt $0; in_lieu $200 + park area x land_cost. | [City](https://www.honolulu.gov/dpp/wp-content/uploads/sites/56/2024/07/park-dedication-instructions.pdf) | 2 Years | calc-shared.ts |
| `per_dwelling` | Constant | 0 | School impact fee (HRS Ch. 302A), a state assessment not waived by the city's fee toggle. Set to 0 for now instead of $1,836/unit. | HRS 302A | 2 Years | calc-shared.ts |
| `wastewater_charge_per_esdu` | Constant | 7539 | Wastewater system facility charge per ESDU. | ROH 43-10.3, Appendix 43-C; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-42932) | 5 Years | calc-shared.ts |
| `wastewaterFee` | Function |  | Chargeable units x ESDU per unit (0.7 for 5+ units, else 1.0) x $7,539. | ROH 43-10.3, Appendix 43-C; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-42932) | 5 Years | calc-shared.ts |
| `excavationDepthByZone` | Function |  | Excavation depth, ft: low density 3, A-2/AMX-2/B-2 5, A-3/AMX-3/Waikiki/BMX-4 9, else 4. |  |  | calc-shared.ts |
| `gradingPermit` | Function |  | <=1,000 cy: $505 + $55 per 100 cy; <10,000 cy: $1,000 + $55 per 1,000 cy; above: $1,495 + $35 per 1,000 cy. Volume = lot sq ft x excavation depth / 27. | ROH 18A-2.4; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-17612) | 5 Years | calc-shared.ts |
| `grubbingPermit` | Function |  | Code: $0 below 15,001 sq ft, $125 up to 16,000 sq ft, + $15 per additional 1,000 sq ft. | ROH 18A-2.4(b); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-17612) | 5 Years | calc-shared.ts |
| `stockpilingPermit` | Function |  | Code: $0 below 101 cy, $70 up to 1,100 cy, + $15 per additional 1,000 cy. | ROH 18A-2.4(c); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-17612) | 5 Years | calc-shared.ts |
| `escp` | Constant | 250 | Erosion and sediment control plan fee. | ROH 18A-1.6(d); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-17519) | 5 Years | calc-shared.ts |
| `installation_trench` | Constant | 195 | $195 permit fee, charged per unit together with service_connection. | ROH 14-2.1; Table (A); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-9521) | 5 Years | calc-shared.ts |
| `service_connection` | Constant | 50 | $50 permit fee, per unit. | ROH 14-2.1; Table (A); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-9521) | 5 Years | calc-shared.ts |
| `ea` / `eis` | Constant | 600 / 1200 | EA and EIS application fees; both charged on every project. | ROH 6-40.2(b); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-4812) | 5 Years | calc-shared.ts |
| FeeBasis (waivable_fee_basis) | Lever | market_units (Bill 7: none) | Units charged the building permit, plan review and wastewater fees (and BWS water charges): all_units, market_units or none. | ROH 43-10.8 |  | parcels.ts |
| `calcSoftCosts` | Function |  | Sums environmental, building permit, plan review, wastewater, WSFC, water meter, temp occupancy, park dedication, ESCP, utilities, grubbing, stockpiling, grading, impact, construction management, zoning application and special district fees. |  |  | calc-shared.ts |

## BWS water charges

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `WSFC_PER_FU` | Table | 271.27 / 204.12 | Water System Facilities Charge per fixture unit, multi-family only: up to 3 living stories $271.27, higher $204.12. Flat, never escalated. |  | Yearly | calc-shared.ts |
| `WSFC_MIN_FU` | Constant | 20 | Minimum fixture units per application. |  | Yearly | calc-shared.ts |
| `WSFC_WAIVER_UNIT_CAP` | Constant | 500 | Affordable-unit WSFC waiver cap, applied per project (BWS's is 500/yr islandwide). |  | Yearly | calc-shared.ts |
| `FU_PER_UNIT` | Table | 7.5 / 9.8 / 11.4 | Fixture units per dwelling, low-flow, in-unit washer, no dishwasher or hose bibb: 1 bath 7.5, 1.5 bath 9.8, 2 bath 11.4. |  | Yearly | calc-shared.ts |
| `BATHS_BY_UNIT_TYPE` | Table | 5 entries | studio/one_bb 1 bath, two_bb 1.5, three_bb/four_bb 2. |  |  | calc-shared.ts |
| `COMMON_AREA_FU` | Constant | 0 | Common-area fixture units; 0 matches BWS's worked examples. |  |  | calc-shared.ts |
| `FIRE_METER_CHARGE` | Table | 8 sizes | Fire service connection charge by meter size: 5/8" $500, 3/4" $600, 1" $700, 1.5" $1,100, 2" $1,700, 4" $5,600, 6" $12,100, 8" $21,100. |  | Yearly | calc-shared.ts |
| `fireMeterSize` | Function |  | Assumed meter: <=3 stories 4", <=6 stories 6", else 8". |  |  | calc-shared.ts |
| `wsfcCategory` / `mixFixtureUnits` / `calcWaterFees` | Function |  | WSFC = max(units x FU + common, 20) x rate, less waived units' FU; meter charge prorated by chargeable units. |  |  | calc-shared.ts |

## Timing

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `stabilization` | Constant | 3 | **xyz** puts 3 months for stabilization period for rental units. Also the minimum carry when no units lease or sell. | **xyz** |  | calc-shared.ts |
| `target_occupancy` | Constant | 0.9 | **xyz** aims for 90% occupied for rental units. | **xyz** |  | calc-shared.ts |
| `absorption_units_per_month` | Constant | 20 | **xyz** does 20 units per month. Lease-up = ceil(90% of rentals / 20) + 3, unless the leaseup_months lever is set. | **xyz** |  | calc-shared.ts |
| `monthly_sale_cap` | Constant | 20 | **xyz** does 20 units per month. | **xyz** |  | calc-shared.ts |
| `permitting_months` / `const_months` / `leaseup_months` | Lever | 18 / 12 / 9 | Overrides for the timing functions above. |  |  | parcels.ts |

## Financing

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `loan_fee` | Constant | 0.0075 | HHFDC typical origination/loan fee rate. Due at closing and paid in equity. | [HHFDC](https://dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) | Yearly | calc-shared.ts |
| `construction_rate` | Constant | 0.08 | 8% annual construction loan rate. Overridable with the `construction_rate` lever. | [Construction loan rates](https://constructionloan-calculator.com/construction-loan-rates.html) | Yearly | calc-shared.ts |
| `cost_carried` | Constant | 0.1 | Pre-development spend during permitting: 10% of construction cost per year (/12 per month), funded from equity. | **xyz** |  | calc-shared.ts |
| `disposition_cost` | Constant | 0.035 | **xyz** assumes a 3.5% disposition/selling cost from GDV (brokerage fees, closing costs, taxes, etc.). | **xyz** |  | calc-shared.ts |
| `rpt_residential` | Constant | 0.0035 | Real property tax rate on assessed value (land + improvements, or land only while an exemption runs). |  | 5 Years | calc-shared.ts |
| `DEFAULT_PROFIT_MARGIN` | Constant | 0.15 | Developer profit as a margin on total project cost (dev cost + financing) in the residual land value. profit_margin lever. |  |  | calc-shared.ts |
| `DEFAULT_TARGET_RETURN` | Constant | 0.115 | Land carry rate: annual cost of capital on the land purchase (target_return lever fallback). |  |  | calc-shared.ts |
| `calcPredevEquity` / `equityFirstDraws` | Function |  | Equity funds land, then monthly pre-development spend, then the rest at construction close. |  |  | calc-shared.ts |
| `calcConstructionInterest` | Function |  | Interest on S-curve draws over const_months at construction_rate, compounded monthly. |  |  | calc-shared.ts |
| `calcLeaseupCarry` | Function |  | Interest carry on the full balance through lease-up/sales months. |  |  | calc-shared.ts |
| `calcAnnualLoanConstant` / `calcDscrMaxLoan` | Function |  | Annual debt service per $1 at permanent_rate over amort_years; DSCR take-out = NOI / (min_dscr x constant). |  |  | calc-shared.ts |
| `sizeConstructionLoan` | Function |  | Construction loan = min(LTC principal at the equity floor, principal that grows to the DSCR take-out). Two loans: RLV basis (no land) and deal basis (with land). |  |  | calc-shared.ts |
| `calcPermanentLoan` | Function |  | Permanent loan = min(balance, DSCR max); equity_gap if short; remaining balance at the end of the hold. min_dscr fallback 1.2. |  |  | calc-shared.ts |
| `calcDevRLV` | Function |  | RLV = (GDV − selling costs − project cost − profit) ÷ (1 + target_return)^(months/12), plus each Bill 7 grant discounted from the month it is paid. |  |  | calc-shared.ts |
| `calcPropertyTax` / `allocatePropertyTax` | Function |  | Stabilized-year tax; split between residential and retail NOI by EGI. |  |  | calc-shared.ts |
| `solveIRR` | Function |  | Bisection IRR on monthly or annual cash flows (bounds -95% to 100%/month or 1,000%/year). |  |  | calc-shared.ts |
| `min_dscr` / `permanent_rate` / `hold_years` / `equity` | Lever | 1.20 / 6.75% / 8 / 30% (Bill 7: 1.15 / 7% / 10 / 30%) | Lender assumptions (defaults set after lender interviews). Per-pathway values are on each pathway page under Default assumptions. |  |  | parcels.ts |

## Hold strategy

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `amort_years` | Constant | 30 | Permanent loan amortization fallback. |  |  | calc-shared.ts |
| `annual_rent_growth` | Constant | 0.04 | Hold-period rent growth for all units: affordable caps track AMI (4%/yr) and market rents grew 3.6–4.3%/yr. Also grows the forward NOI at exit. |  | Yearly | calc-shared.ts |
| `annual_opex_growth` | Constant | 0.035 | Operating expenses grow on their own series, not as a fixed share of EGI. |  | Yearly | calc-shared.ts |
| `annual_assessment_growth` | Constant | 0.02 | Property-tax assessment escalation. |  | Yearly | calc-shared.ts |
| `exit_cap_spread` | Constant | 0.005 | Exit cap = entry cap + 50 bps. |  |  | calc-shared.ts |
| `tax_exemption_years` | Constant | 15 | Improvements exempt from property tax for 15 years: Bill 7 (when affordable AMI <= 80%) and TOD. Land is still taxed. | ROH 32 | 5 Years | calc-shared.ts |

## Cap rates

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `DEFAULT_CAP_RATE` | Constant | 0.051 | Market cap rate, the same for every zone. Replaces the metro/suburban lookups. | [apartmentloanstore.com](https://apartmentloanstore.com/honolulu/hawaii/cap-rate) | Yearly | calc-shared.ts |
| `DEFAULT_TARGET_SPREAD` | Constant | 0.015 | Required return-on-cost spread over the cap rate (150 bps). Target ROC = cap rate + spread; a project is feasible when ROC >= target. |  |  | calc-shared.ts |
| `resolveCapRate` | Function |  | cap_rate lever if set and > 0, else DEFAULT_CAP_RATE. |  |  | calc-shared.ts |
| `RETAIL_CAP_SPREAD` | Constant | 0.015 | Retail cap rate = residential cap rate + 1.5%. | **xyz** |  | calc-shared.ts |

## Car parking

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `residential_sqft_per_stall` | Constant | 1000 | 1 stall per 1,000 sq ft of private dwelling area, common areas excluded. Standard, Before Ord. 26-7 and 201H apply it unless the parcel is parking_exempt. | ROH 21-6.20; Table 21-6.1; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20721) | 5 Years | calc-shared.ts |
| `retail_sqft_per_stall` | Constant | 500 | Commercial 1 (retail, eating and drinking, offices): 1 stall per 500 sq ft. | ROH Table 21-6.1; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20721) | 5 Years | calc-shared.ts |
| `joint_use` | Constant | 0.9 | Housing and retail sharing stalls and loading need 90% of the sum. | ROH 21-6.30(g); Table 21-6.2 | 5 Years | calc-shared.ts |
| `legalParkingRatio` | Function |  | Minimum stalls per unit = blended unit size / 1,000. | ROH 21-6.20; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20721) | 5 Years | calc-shared.ts |
| `article6Parking` | Function |  | Article 6 inputs to podiumEnvelope: retail stalls (0 if exempt), joint use, loading when lot > 7,500 sq ft, bicycle parking. | ROH 21-6.20(a); 21-6.110; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20721) |  | calc-shared.ts |
| `parking_ratio` / `parking_exempt` | Lever | Article 6 minimum (TOD and Bill 7: 0) / from the parcel | Stalls per unit override (TOD and Bill 7 default to 0; no parking is required under ROH 32-2.3 or in TOD). `parking_exempt`: no off-street parking required (Primary Urban Center and Ewa plan areas, within 0.5 mi of rail, TOD special districts). | ROH 21-6.20(a); ROH 32-2.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20721) |  | parcels.ts |
| `stalls_per_unit` | Constant | 0 | Default stalls per unit (TOD fallback). |  |  | calc-shared.ts |
| `stall_sqft` | Constant | 330 | Gross sq ft per structured stall including drive aisles (Ulupono 2020). | ROH 21-6.50(a); Ulupono Initiative 2020; | 5 Years | calc-shared.ts |
| `monthly_rent_per_stall` | Constant | 100 | Assumed $100 monthly car parking rent. |  |  | calc-shared.ts |
| `cost_per_sqft` | Constant | 190 | RLB Q2 2026 Honolulu above-ground parking, low end of $190-245 per sq ft. | RLB Q2 2026 Quarterly Cost Report | Yearly | calc-shared.ts |
| `surface_stall_sqft` | Constant | 360 | Surface lot sq ft per stall (Ulupono 2020 on-grade, adjusted to 2026 + margin). | Ulupono Initiative 2020 | 5 Years | calc-shared.ts |
| `surface_cost_per_sqft` | Constant | 30 | Surface lot construction cost per sq ft. | Ulupono Initiative 2020 | Yearly | calc-shared.ts |
| `calcParkingIncome` | Function |  | Stalls x $100 x 12, added to PGI. |  |  | calc-shared.ts |
| parking_cost (in podiumEnvelope) | Function |  | Parking sq ft x surface or structured cost per sq ft. |  |  | calc-shared.ts |
| `roundHalfUp` | Function |  | A fraction of 0.5 or more rounds up. | ROH 21-6.20(b)(1); 21-6.110(b)(3); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20721) |  | calc-shared.ts |

## Loading

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `min_lot_sqft` | Constant | 7500 | Lots of 7,500 sq ft or less need no loading space. | ROH 21-6.110; Table 21-6.5 | 5 Years | calc-shared.ts |
| `small_sqft` | Constant | 161.5 | 19 ft x 8 ft 6 in. | ROH 21-6.130 | 5 Years | calc-shared.ts |
| `large_sqft` | Constant | 420 | 35 ft x 12 ft, for a third of the spaces when more than one is required. | ROH 21-6.130(a) | 5 Years | calc-shared.ts |
| `loadingSpaces` | Function |  | Multifamily: <20 units 0, <=150 1, <=300 2, then +1 per 200. Retail: <2,000 sq ft 0, <=10,000 1, <=20,000 2, <=40,000 3, <=60,000 4, then +1 per 50,000. Joint-use rate when both need one. | ROH Table 21-6.5 | 5 Years | calc-shared.ts |
| `loadingSqft` | Function |  | Ground area the loading spaces take. | ROH 21-6.130(a) |  | calc-shared.ts |

## Bicycle parking

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `units_per_space` | Constant | 10 | Short-term: 1 per 10 units. | ROH 21-6.40; Table 21-6.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20743) | 5 Years | calc-shared.ts |
| `retail_sqft_per_space` / `stalls_per_space` | Constant | 2000 / 10 | Short-term commercial: 1 per 2,000 sq ft or 1 per 10 vehicle spaces, whichever is greater. | ROH Table 21-6.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20743) | 5 Years | calc-shared.ts |
| `cost_per_space` | Constant | 225 | Installed U-rack (GoodLockers, Nov 2025). | ROH 21-6.40; GoodLockers, Nov 2025 | Yearly | calc-shared.ts |
| `units_per_space` | Constant | 2 | Long-term: 1 per 2 units. | ROH 21-6.40; Table 21-6.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20743) | 5 Years | calc-shared.ts |
| `retail_sqft_per_space` / `stalls_per_space` | Constant | 12000 / 30 | Long-term commercial: 1 per 12,000 sq ft or 1 per 30 vehicle spaces, whichever is greater. | ROH Table 21-6.3; [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20743) | 5 Years | calc-shared.ts |
| `cost_per_space` | Constant | 1250 | Installed locker (GoodLockers, Nov 2025). | ROH 21-6.40; GoodLockers, Nov 2025 | Yearly | calc-shared.ts |
| `sqft_per_space` | Constant | 22 | 2 ft x 6 ft plus 5 ft clear on the 2 ft access side = 22 sq ft; one value for short- and long-term now. | ROH 21-6.40(d)(1); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20743) | 5 Years | calc-shared.ts |
| `bicycleRequired` | Function |  | Bicycle parking required everywhere except industrial districts. | ROH 21-6.40(a); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20743) |  | calc-shared.ts |
| `bicycleSpaces` | Function |  | Short- and long-term spaces for housing and retail, 0.5+ rounds up. | ROH 21-6.40(b); [ROH](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-20743) |  | calc-shared.ts |
| `calcBicycleParkingCost` | Function |  | Short-term x $225 + long-term x $1,250 (floor area is in the envelope). | GoodLockers, Nov 2025 |  | calc-shared.ts |

## Other income

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `application_fee` | Constant | 50 | Application fee ($50), charged on 30% of units per year. |  | 5 Years | calc-shared.ts |
| `lease_renewal` | Constant | 200 | Lease renewal fee ($200), charged on 70% of units per year. |  | 5 Years | calc-shared.ts |
| Admin income split | Inline constant | 0.3 / 0.7 | Admin income = units x 0.3 x application_fee + units x 0.7 x lease_renewal (assumed 30% turnover / 70% renewals). |  |  | calc-standard.ts, calc-bill6.ts, calc-bill7.ts, calc-tod.ts, calc-h201.ts |
| `include_retail` / `retail_share` | Lever | false / 0.1 | Whether to build ground-floor retail, and its share of the floor plate. |  |  | parcels.ts |

## Operating expenses

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `opex_ratio` | Constant | 0.2 fallback; defaults 0.3 (Bill 7 and 201H: 0.19) | Opex as a share of EGI, excluding property tax (modeled separately). The code fallback is 0.2; `DEFAULT_INPUTS` sets 0.3, and 0.19 for Bill 7 and 201H (GET exemption assumed). |  |  | calc-shared.ts |

## Bill 7

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `GRANT` | Table | 50000 / 12000 | Bill 7 grant per unit: pre_construct $50,000 on every unit, post_construct $12,000 per affordable unit. The `grant_amount` lever overrides. | ROH chp 32 article 4 & 5 | Yearly | calc-shared.ts |
| `building_area_per_unit` | Lever | 800 | Bill 7 unit cap: max_units_by_law = floor(lot sq ft x FAR / 800). | ROH 32 | Yearly | parcels.ts |
| `max_units_by_law` | Inline constant |  | Bill 7 legal unit cap from FAR and building_area_per_unit. | ROH 32 |  | calc-bill7.ts |
| Bill 7 tax exemption AMI | Inline constant | 80 | 15-year improvement exemption applies only when affordable_ami <= 80%. | ROH 32 | Yearly | calc-bill7.ts |
| `DEFAULT_RETAIL_RENT` | Constant | 3 | Bill 7 retail rent fallback, $/sq ft/month. |  |  | calc-bill7.ts |
| `DEFAULT_HEIGHT_LIMIT` | Constant | 30 | Bill 7 height when a parcel has none, ft. |  |  | calc-bill7.ts |
| `DEFAULT_PERMANENT_RATE` | Constant | 0.07 | Bill 7 fallback. |  |  | calc-bill7.ts |
| `DEFAULT_HOLD_YEARS` | Constant | 10 | Bill 7 fallback hold, years. |  |  | calc-bill7.ts |
| `DEFAULT_LAND_COST` | Constant | 130 | Bill 7 fallback land cost, $/sq ft. |  |  | calc-bill7.ts |
| `DEFAULT_GRANT_TYPE` | Constant | post_construct | Bill 7 fallback grant type. |  |  | calc-bill7.ts |
| `DEFAULT_INCLUDE_RETAIL` | Constant | False |  |  |  | calc-bill7.ts |
| `DEFAULT_AFFORDABLE_AMI` / `DEFAULT_MARKET_AMI` | Constant | ami_80 / ami_100 | Bill 7 fallbacks. |  |  | calc-bill7.ts |

## Pathway fallback constants

Each pathway file keeps fallbacks for when a lever is not set. `DEFAULT_INPUTS` sets every lever, so these apply only when an app calls a pathway's calc function directly with missing inputs.

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `STD_DEFAULT_EQUITY` | Constant | 0.3 |  |  |  | calc-standard.ts |
| `STD_DEFAULT_HEIGHT_LIMIT` | Constant | 30 | Height when a parcel has none, ft. |  |  | calc-standard.ts |
| `STD_DEFAULT_FLOOR_HEIGHT` | Constant | 10 |  |  |  | calc-standard.ts |
| `STD_DEFAULT_LAND_COST` | Constant | 130 |  |  |  | calc-standard.ts |
| `STD_DEFAULT_PERMANENT_RATE` | Constant | 0.0675 |  |  |  | calc-standard.ts |
| `STD_DEFAULT_HOLD_YEARS` | Constant | 10 | DEFAULT_INPUTS sets 8. |  |  | calc-standard.ts |
| `BILL6_DEFAULT_EQUITY` | Constant | 0.3 |  |  |  | calc-bill6.ts |
| `BILL6_DEFAULT_HEIGHT_LIMIT` | Constant | 30 | Height when a parcel has none, ft. |  |  | calc-bill6.ts |
| `BILL6_DEFAULT_FLOOR_HEIGHT` | Constant | 10 |  |  |  | calc-bill6.ts |
| `BILL6_DEFAULT_LAND_COST` | Constant | 130 |  |  |  | calc-bill6.ts |
| `BILL6_DEFAULT_PERMANENT_RATE` | Constant | 0.0675 |  |  |  | calc-bill6.ts |
| `BILL6_DEFAULT_HOLD_YEARS` | Constant | 10 | DEFAULT_INPUTS sets 8. |  |  | calc-bill6.ts |
| `TOD_DEFAULT_HEIGHT_LIMIT` | Constant | 60 |  |  |  | calc-tod.ts |
| `TOD_DEFAULT_FLOOR_HEIGHT` | Constant | 10 |  |  |  | calc-tod.ts |
| `TOD_DEFAULT_ZONE_CLASS` | Constant | AMX-1 |  |  |  | calc-tod.ts |
| `TOD_DEFAULT_EQUITY` | Constant | 0.3 |  |  |  | calc-tod.ts |
| `TOD_DEFAULT_LAND_COST` | Constant | 130 |  |  |  | calc-tod.ts |
| `TOD_DEFAULT_PERMANENT_RATE` | Constant | 0.0675 |  |  |  | calc-tod.ts |
| `TOD_DEFAULT_HOLD_YEARS` | Constant | 10 | DEFAULT_INPUTS sets 8. |  |  | calc-tod.ts |
| `TOD_DEFAULT_RETAIL_RENT` | Constant | 5 |  |  |  | calc-tod.ts |
| `TOD_DEFAULT_AFFORDABLE_AMI` / `TOD_DEFAULT_MARKET_AMI` | Constant | ami_80 / ami_120 |  |  |  | calc-tod.ts |
| `H201_DEFAULT_HEIGHT_LIMIT` | Constant | 30 |  |  |  | calc-h201.ts |
| `H201_DEFAULT_ZONE_CLASS` | Constant | A-2 |  |  |  | calc-h201.ts |
| `H201_DEFAULT_AFFORDABILITY` | Constant | 0.51 |  |  |  | calc-h201.ts |
| `H201_DEFAULT_EQUITY` | Constant | 0.3 |  |  |  | calc-h201.ts |
| `H201_DEFAULT_LAND_COST` | Constant | 130 |  |  |  | calc-h201.ts |
| `H201_DEFAULT_PERMITTING_MO` | Constant | 18 |  |  |  | calc-h201.ts |
| `H201_DEFAULT_PERMANENT_RATE` | Constant | 0.0675 |  |  |  | calc-h201.ts |
| `H201_DEFAULT_HOLD_YEARS` | Constant | 10 | DEFAULT_INPUTS sets 8. |  |  | calc-h201.ts |
| `H201_DEFAULT_RETAIL_RENT` | Constant | 5 |  |  |  | calc-h201.ts |
| `H201_DEFAULT_AFFORDABLE_AMI` / `H201_DEFAULT_MARKET_AMI` | Constant | ami_80 / ami_120 |  |  |  | calc-h201.ts |

## Feasibility

| Name | Kind | Value | What it is | Source | Review | File |
| --- | --- | --- | --- | --- | --- | --- |
| `rocLevel` | Function | target - 0.01 / target | Return on cost: poor below target ROC - 100 bps, marginal within 100 bps, strong at or above target ROC (cap rate + DEFAULT_TARGET_SPREAD). |  |  | feasibility.ts |
| `rlvLevel` | Function | 0.9 / 1.1 | RLV per sq ft / land price: poor below 90%, marginal 90-110%, strong 110%+. |  |  | feasibility.ts |
| `equityMultipleLevel` | Function | 2 / 2.5 | Development-grade equity multiple bands. |  |  | feasibility.ts |
| `irrLevel` | Function | 0.08 / 0.12 | Levered IRR over the hold. |  |  | feasibility.ts |
| `overallLevel` | Function |  | Verdict from the four scored metrics: poor if at least half are poor; strong if none are poor and at least 75% are strong; else marginal. Replaces **xyz**'s capped Poisson probability. |  |  | feasibility.ts |
| `LEVEL_COLOR` | Table | 3 colors | poor #ef4444, marginal #facc15, strong #22c55e. |  |  | feasibility.ts |

## Defined but not used

These are still in the code but nothing reads them. They are kept for reference or for features that may return.

| Name | Group | Value | Notes | File |
| --- | --- | --- | --- | --- |
| `rental_split` | Levers | 1 | Share of units built as rentals. Every pathway builds 0 sale units (for-sale discarded 8/26/2026, deferred to Chapter 29), so the lever is not read. | parcels.ts |
| `sale_split` | Levers | 0 | Share of units built for sale. Not read; see rental_split. | parcels.ts |
| `PARK_BUILD_COST_PER_SQFT` | Park dedication | 145 | Data on the average cost of construction for parks/playgrounds for Oahu could not be found, so the RLB Q4 lower-end industrial construction cost ($145/sq ft) was used. Defined but no longer read: in-lieu is now valued at land_cost x park area. | calc-shared.ts |
| `COST_PER_ZONE` | Construction | A-1 170.5 ... AMX-2 266.91 | Assigned the RLB Q4 2025 data to the closest description of each A-AMX building standard. Unused since 2026-08-05; replaced by hard_cost_per_sqft. | calc-shared.ts |
| `setbackFootprint` | Building envelope |  | Older single-setback footprint. Defined but no longer called (replaced by yardFootprint). | calc-shared.ts |
| `home` | Vacancy | 0.01 | Homeowner vacancy. Not read. | calc-shared.ts |
| `equity` | Financing | 0.1 | **xyz** 10% equity share. Not read; the equity lever (default 0.3) is used and acts as a floor once the loan is sized to the DSCR take-out. | calc-shared.ts |
| `dev_fee` | Financing | 0.1 | **xyz**'s 10% developer fee. Not read; developer profit is now DEFAULT_PROFIT_MARGIN. | calc-shared.ts |
| `property_mgmt_rate` | Operating expenses | 0.15 | Property management fees are 15% of total rent yearly. Not read since opex_ratio. | calc-shared.ts |
| `property_insurance_unit` | Operating expenses | 1000 | Property insurance is $1000 per unit. Not read. | calc-shared.ts |
| `liability_insurance_unit` | Operating expenses | 150 | Liability insurance is $150 per unit yearly. Not read. | calc-shared.ts |
| `monitor_unit` | Operating expenses | 60 | Affordable unit monitoring fee per unit. Not read. | calc-shared.ts |
| `H201_DEFAULT_SALE_SPLIT` | Pathway fallback constants | 0.4 | Exported but not read (no sale units). | calc-h201.ts |
