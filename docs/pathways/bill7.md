# Bill 7 (Ord. 19-8, ROH Chapter 32)

Bill 7 (Ordinance 19-8, ROH Chapter 32) is the Affordable Rental Housing Program: relaxed development standards and financial incentives for projects that rent at least 80% of their units as affordable. It runs in `src/calculations/calc-bill7.ts`, program id `bill7`. Everything not listed here follows [Housing Policy Simulator logic](../simulator-logic.md). Two parts are unique to this pathway: the city [grants](#grants) and the [prevailing wage premium](#prevailing-wage-premium) that comes with the pre-construction subsidy.

## Envelope

Chapter 32 sets its own development standards (§ 32-2.3) in place of the underlying zone's.

| Rule | Requirement | Model |
| --- | --- | --- |
| Lot size | At most 20,000 sq ft | The Citywide View's Bill 7 parcel set holds only lots of 20,000 sq ft or less (7,822 parcels in apartment, AMX, BMX and Waikiki zones) |
| FAR | 4.0 | 4.0 in every zone; the open-space bonus does not apply, since Ch. 32 sets its own FAR |
| Lot coverage | 80% of the zoning lot | 80% in every zone, including the Waikiki precincts |
| Height | 60 ft | Capped at 60 ft whatever the zoning, even when the Max Height lever is locked higher |
| Yards | Front 10 ft, side and rear 5 ft, or the zone's if less | The Setbacks slider (default 10 ft) |
| Unit cap | Maximum density | Units at most lot area × 4.0 ÷ the building area per unit (default 800 sq ft) |

## Height setbacks

None. Chapter 32's development standards set "Height setbacks: None" (Ord. 19-8), and the pending Bill 72 (2025) keeps this, so the model applies no step-backs.

## Parking and loading

| Requirement | Bill 7 |
| --- | --- |
| Car parking | None (§ 32-2.3); the Parking lever defaults to 0 stalls |
| Bicycle parking | None; the § 21-6.40 requirement does not apply (Ord. 19-8) |
| Loading | None, but loading and garbage storage must be accommodated on site; the model reserves no loading spaces |

With no parking requirement, Bill 7 projects carry none of the parking-related soft and hard costs a Standard project does. A user can still add stalls with the Parking lever.

## Affordability

80% of units are affordable rentals, at the Affordable Unit Rent level (default 80% AMI); the rest rent at the market level (default 100% AMI). There are no for-sale units.

**The Chapter 32 rent cap moves every year.** [ROH § 32-1.1](https://dbedt.hawaii.gov/hhfdc/files/2023/12/2023-1214-III.F.-Ch-32_Affordable-Rental-Housing-Program-SECURED.pdf) requires that "for a period of at least 15 years after a certificate of occupancy is issued … the affordable units are rented at or below the rental rate limits established by [HUD] for households earning 100 percent of the AMI." It defines AMI as "the current AMI determined by [HUD] annually." Nothing ties the cap to the year of application or permit, so it rises while a project waits in permitting. The 15-year restriction outlasts the model's 10-year hold, so the cap applies for the whole hold. The model's rent formula matches DPP's published maximums:

| 100% AMI, DPP 2026 | Income limit | Maximum rent (DPP) | 30% × income ÷ 12 |
| --- | --- | --- | --- |
| Studio (1 person) | $107,800 | $2,695 | $2,695 |
| One-bedroom (1–2 persons) | $115,500 (average) | $2,887 | $2,887 |

How rents grow over time is in [Rent growth](../simulator-logic.md#rent-growth).

## Fees, waivers and taxes

Bill 7 waives several government fees; these waivers apply to the affordable portion of the project, units rented to households earning less than or equal to 100% AMI and/or below the HUD rent limits for that AMI level.

**Wastewater system facility charges:** fully waived (Ord. 19-8 § 3, amending ROH 14-10). Affordable dwelling units are exempt from wastewater facility charges entirely. In the model this is applied by charging the wastewater fee only on the non-affordable (market) unit count.

**Building permit and plan review fees:** waived in proportion to the affordable share (Ord. 19-8 § 4, adding ROH 18-6.5(i)). The building official waives these fees for "the portion of an affordable rental housing project equal to the percentage of affordable rental housing units." This is a proportional waiver, not a flat one: at an 80/20 split, roughly 80% of the permit and plan-review fees are waived and the remaining ~20% (the market portion) is charged. The model approximates this by charging permit and plan-review fees on the market unit count.

**Park dedication:** affordable units exempt (Ord. 19-8 § 5, amending ROH 22-7.3(j)), and Bill 7 units are fully exempt under ROH 43-10.8. In the model, Bill 7 park dedication defaults to none; choosing the in-lieu fee charges it as the other pathways do, to show what the waiver is worth.

**BWS water charges:** the Impact Fees toggle defaults to Exempt for Bill 7, so the WSFC and new meter charges are waived. If the toggle is set to All, Bill 7 projects pay both charges in full. See [BWS water charges](../simulator-logic.md#bws-water-charges-water-system-facilities-charge-and-new-meter-cost).

**GET exemption:** operating expenses are modeled at 19% of EGI, assuming the project applies for and is granted the GET exemption and certificate (see [Operating expenses](../simulator-logic.md#operating-expenses)).

**Property tax:** improvements are exempt for 15 years (land-only tax) while the affordable rent is 80% AMI or less.

***Note:*** school impact fees are not waived. School impact fees are a separate state assessment (HRS Chapter 302A) rather than a City fee under Bill 7's authority, so they are not waived by the ordinance and continue to apply to all units.

## Default assumptions

| Input | Default |
| --- | --- |
| Unit mix | Half studio, half one-bedroom |
| Affordable share | 80% |
| Affordable / market rent | 80% / 100% AMI |
| Hard cost | $450 per sq ft |
| Operating expense ratio | 19% of EGI (GET exemption assumed) |
| Parking | 0 stalls |
| Park dedication | Exempt |
| Impact Fees toggle | Exempt |
| Permanent rate / minimum DSCR | 7.0% / 1.15 |
| Hold period | 10 years |
| Timeline | 18 months of permitting, 12 of construction and 9 of lease-up |
| Building area per unit | 800 sq ft |
| Retail rent | $3 per sq ft per month |
| Grant | Post-construction, $12,000 per affordable unit |

## Incentives

| Incentive | Model |
| --- | --- |
| Grant per eligible unit | The Grant Type toggle picks one. Post-construction (default): $12,000 per affordable unit ($40 per sq ft for units under 300 sq ft), paid when construction ends. Pre-construction: $50,000 per unit, on every unit, paid evenly over the construction months; it requires prevailing wages and is capped (see [Grants](#grants)). Neither grant displaces equity or the loan: each comes back to the developer as cash in the month it is paid, and the residual land value adds each one discounted from that month |
| Real property tax exemption | Improvements are exempt for 15 years (land-only tax) while the affordable rent is 80% AMI or less |
| GET exemption | Operating expenses modeled at 19% of EGI |
| Fee waivers | Building permit, plan review, wastewater, park dedication and BWS charges (above) |
| No parking | No stalls, no loading spaces, no bicycle parking |

**Not modeled:** stacking Bill 7 grants with 201H or other subsidies. A project that meets both programs' requirements could combine them (ROH Chapter 32, Articles 4 and 5), but each run is a single pathway.

## Grants

A Bill 7 project can take one of two city grants: the post-construction grant (ROH § 32-4.2) or the pre-construction subsidy (ROH § 32-5.2).

| Item | Pre-construction | Post-construction |
| --- | --- | --- |
| Amount per unit | $50,000 | $12,000; $40/sq ft under 300 sq ft |
| Units paid | All units (option: affordable only) | Affordable units: 80% of units, rounded up |
| When paid | Evenly over the construction months | Lump sum when construction ends |
| Prevailing wage premium | 45% of on-site labor, 11.25% of hard cost | None |
| Cap | On-site labor at prevailing wages, 36.25% of hard cost | None |
| Explicit `grant_amount` input | Overrides $50,000, still capped | Overrides, applied to every affordable unit |

Every run uses 18 months of permitting and 12 of construction unless the user sets other values, and the grant payouts follow those months. The model's studio is exactly 300 sq ft, so no preset unit mix triggers the $40/sq ft rule today.

***Note:*** return on cost takes both grants off the development cost at face value, undiscounted. That is the convention: return on cost is one stabilized year of NOI over cost, with no timing, so the grants' timing shows up in the residual land value (each grant discounted from the month it is paid) and the levered IRR (monthly cash flows) instead. The Project View's hint reads "Stabilized NOI ÷ Total Development Cost, net of grants". See [Feasibility metrics](../simulator-logic.md#feasibility-metrics).

### Legal basis

Every grant rule in the model traces to one of three provisions:

- ROH § 32-4.2, the post-construction grant.
- ROH § 32-5.2, the pre-construction subsidy, added by Ord. 25-19.
- HRS § 104-2, prevailing wages.

| Provision | What it says | In the model |
| --- | --- | --- |
| ROH § 32-4.2(c)(1)(A) | Units under 300 sq ft get $40 per sq ft of floor area | `postGrantPerUnit`, `mixPostGrant` |
| ROH § 32-4.2(c)(1)(B) | Units 300 sq ft or more get $12,000 per affordable rental housing unit | `GRANT.post_construct` |
| ROH § 32-4.2(c)(2), (c)(5) | Apply after the certificate of occupancy, up to 12 months later; paid within 30 days | Lump sum when construction ends |
| ROH § 32-5.2(c)(1) | A project can't get both grants | `grant_type` allows one |
| ROH § 32-5.2(c)(2) | "A total of $50,000 for each unit" | Pays on all units by default |
| ROH § 32-5.2(c)(3) | Subsidy may only pay prevailing wages to every on-site laborer and mechanic, under HRS Chapter 104 | Premium on labor, plus the labor cap |
| ROH § 32-5.2(c)(4), (8) | Apply after the building permit; escrow pays out in proportion to certified payroll | Paid evenly over the construction months |
| ROH § 32-5.2(6)(C) | Certificate of occupancy within 24 months of the building permit | Noted only, not modeled. It never binds at the default 12 construction months. A user who sets construction longer than 24 months would miss it, and missing it means returning the subsidy ((6)(E)) unless the director extends the deadline |
| ROH § 32-5.2(6)(B), (6)(F), (8) | Annual certified payrolls, audits, escrow agent | Noted only, not modeled: escrow agent fees, weekly certified payrolls (HRS § 104-3), annual reports to DPP and audit cooperation. No dollar figure |
| ROH § 32-5.2(b)(1) | $10M general-fund cap, shared by both programs | Not modeled (about 200 units citywide at $50,000) |
| HRS § 104-2(b) | Every on-site laborer and mechanic is paid at least prevailing wages, which DLIR sets | Basis for whole-project coverage |
| HRS § 104-2(c) | Overtime after 8 hours a day, and on weekends and holidays | Not quantified |

### Interpretation decisions

Eight calls set how the model reads the ordinance:

| Decision | Choice | Reasoning |
| --- | --- | --- |
| Who gets prevailing wages | Every on-site worker, not just the labor the subsidy pays for | ROH § 32-5.2(c)(3) copies HRS § 104-2(b) word for word ("every laborer and mechanic performing work on the job site"). (6)(B) requires "all payrolls", and (8) pays out in proportion to "prevailing wages paid to date." |
| Units the pre-construction subsidy pays on | All units, not just affordable ones | Chapter 32 defines "affordable rental housing unit" and uses it in § 32-4.2. § 32-5.2(c)(2) says "each unit" instead. The project still has to qualify (at least 80% of units at or below 100% AMI). |
| Post-construction prevailing wages | None | § 32-4.2 has no wage condition. |
| How the pre-construction subsidy enters the financing | Cash to the developer during construction; full equity at closing | Escrow repays certified payroll in arrears, so the money isn't there at closing. |
| Pre-construction payout shape | Even amounts each construction month, from the month after construction starts to the month it ends | § 32-5.2(8) pays "pro rata in proportion to the prevailing wages paid to date". HRS § 104-3(a) makes certified payrolls weekly, so monthly payouts with no lag are plausible. An S-curve has the same midpoint, so results barely differ. |
| Post-construction payout | Lump sum when construction ends | § 32-4.2(c)(2) allows applying from the certificate of occupancy; the city pays within 30 days of DPP's certification (c)(5). The 1–3 month lag is left out as too fine for the model. |
| Permitting and construction months | 18 and 12 for every pathway and zone | Users can set other months, and grant payouts follow them. |
| Hold IRR equity timing | Land at month 0, predevelopment through permitting, the rest at loan closing, in every pathway | Same schedule as the flip. Putting all equity at month 0 would understate hold IRRs. |

***Note:*** One caveat on units, these definitions come from Ord. 19-08 as enacted in 2019, and later ordinances may have amended them.

### The labor cap

The subsidy can't exceed on-site labor at prevailing wages (§ 32-5.2(c)(3)): 25% × 1.45 = 36.25% of hard cost.

```math
\text{subsidy} = \min(\text{units} \times \$50{,}000,\ \text{market-wage hard cost} \times 0.25 + \text{premium})
```

The cap rarely binds. In the worked example below it is $1.31M against a $700,000 subsidy, about 1.9 times. `subsidy_cap_binds` reports when it does, and the app does not show the cap yet.

### Worked example: 5,000 sq ft lot

This example uses the Project View's Bill 7 defaults (`test/data/calculator-defaults.json`) on a 5,000 sq ft lot: 14 units, 12 of them affordable.

| Output | Post-construction grant | Pre-construction, no premium | Pre-construction, 45% premium |
| --- | --- | --- | --- |
| Grant | $144,000 (12 affordable units) | $700,000 (all 14 units) | $700,000 (all 14 units) |
| Hard cost | $3.61M | $3.61M | $4.02M (+$406,000 premium) |
| Labor cap | none | $0.90M, doesn't bind | $1.31M, doesn't bind |
| Return on cost | 6.58% | 7.41% | 6.71% |
| Residual land value per sq ft | $176 | $266 | $186 |
| Levered IRR | 13.6% | 17.4% | 14.0% |
| Verdict | strong | strong | strong |

At the 45% premium, the pre-construction subsidy is still slightly better than the post-construction grant on this lot, but most of its advantage goes to wages.

### Grant inputs and outputs

| Input (`SliderInputs`) | Default | Meaning |
| --- | --- | --- |
| `grant_type` | `"post_construct"` | `"none"`, `"pre_construct"` or `"post_construct"` |
| `grant_amount` | $50,000 pre, `mixPostGrant(unit_type)` post | Per unit |
| `grant_units` | `"all"` | Units the pre-construction subsidy pays on; `"affordable"` is the alternative |
| `prevailing_wage_premium` | 0.45 | Pre-construction only: extra cost of on-site labor at prevailing wages, as a share of that labor |
| `onsite_labor_share` | 0.25 | On-site labor as a share of hard cost; sets the premium and the cap |

The defaults live in `calc-bill7.ts` and the `PREVAILING_WAGE` and `GRANT` constants in `calc-shared.ts`, not in `DEFAULT_INPUTS`, so a pathway default can't override them.

Outputs (`ParcelOutput`, Bill 7 only):

- `pw_premium_cost`: prevailing wage cost included in `hard_cost`
- `subsidy_labor_cap`: on-site labor at prevailing wages, the most the subsidy may pay
- `subsidy_cap_binds`: true when the cap cut the subsidy

## Prevailing wage premium

A pre-construction subsidy may only pay prevailing wages to on-site laborers and mechanics (ROH § 32-5.2(c)(3), HRS Chapter 104). So on pre-construction runs the model raises hard cost by a prevailing wage premium. The premium is charged only on labor: on-site labor is 25% of hard cost, and prevailing wages cost 45% more than that labor, so hard cost rises 11.25%. Materials, equipment and contractor overhead carry no premium.

```math
\text{premium} = \text{market-wage hard cost} \times 0.25 \times 0.45 = 0.1125 \times \text{market-wage hard cost}
```

The premium is added to hard cost after cost escalation, so it carries through contingency, construction management, predevelopment costs and the loan. It is included in `hard_cost` and shown in the Project Summary's Uses of Funds under Hard Costs. Property tax still uses the market-wage hard cost, since higher wages don't make the building worth more. Post-construction runs get no premium.

The constant is `PREVAILING_WAGE.labor_premium` in `src/calculations/calc-shared.ts` (0.45, up from 0.15), and `prevailing_wage_premium` overrides it per run. The chosen sensitivity range is **35% to 55%**, about 9–14% of hard cost.

### What counts as the prevailing wage

The prevailing wage is the basic hourly rate **plus** fringe benefits. [HRS § 104-1](https://www.capitol.hawaii.gov/hrscurrent/Vol02_Ch0046-0115/HRS0104/HRS_0104-0001.htm) defines wages as "the basic hourly rate and the cost to an employer of furnishing a laborer or mechanic with fringe benefits, including but not limited to health and welfare benefits, vacation benefits, and pension benefits, whether paid directly or indirectly."

| Component | What it is | In the DLIR total? |
| --- | --- | --- |
| Basic hourly rate | Cash wage for regular, non-overtime hours | Yes |
| Fringe | Health, pension, vacation and training contributions, per hour worked | Yes |
| Overtime | 1.5× basic, plus the full fringe (Bulletin 509, note 13) | Not in the hourly total; paid on top |
| Payroll taxes and insurance | Social Security, Medicare, unemployment insurance, workers' comp | No; paid on every job, prevailing wage or not |

Because payroll taxes are paid either way, both sides of the comparison below leave them out.

### The data: Oʻahu prevailing rates vs. Honolulu market wages

Weighted by Honolulu employment, prevailing wages total **$81.90/hr** (basic $51.20 + fringe $30.70). The median cash wage in the same trades is **$42.66/hr**. Both sources cover Oʻahu: DLIR's schedule applies statewide, and BLS's Urban Honolulu area is Honolulu County.

| Trade | DLIR basic ($/hr) | DLIR fringe ($/hr) | DLIR total ($/hr) | BLS median wage ($/hr) | Honolulu employment |
| --- | --- | --- | --- | --- | --- |
| Carpenter | 55.50 | 29.74 | 85.24 | 45.34 | 3,120 |
| Construction laborer (Laborer I) | 42.85 | 26.81 | 69.66 | 37.48 | 3,040 |
| Electrician (inside wireman) | 56.55 | 33.16 | 89.71 | 48.21 | 2,290 |
| Plumber | 53.83 | 32.95 | 86.78 | 39.00 | 1,810 |
| Operating engineer (group 1) | 57.66 | 35.46 | 93.12 | 56.55 | 1,430 |
| Painter | 44.05 | 31.23 | 75.28 | 31.81 | 1,390 |
| Roofer | 44.95 | 22.80 | 67.75 | 28.47 | 860 |
| Drywall installer | 55.75 | 29.74 | 85.49 | 50.92 | 710 |
| Cement finisher | 46.83 | 38.03 | 84.86 | 46.28 | 500 |
| Sheet metal worker | 51.20 | 33.82 | 85.02 | 44.89 | 440 |
| Iron worker | 50.50 | 41.46 | 91.96 | 48.01 | not published |

DLIR rates are from [Wage Rate Schedule Bulletin No. 509](https://labor.hawaii.gov/wsd/files/2025/09/WRS509.pdf), effective September 15, 2025. BLS wages and employment are from [OEWS, Urban Honolulu, May 2025](https://www.bls.gov/oes/current/oes_46520.htm), pulled from the BLS API. BLS wages are cash pay only and include union workers. Iron workers are left out of the weighted figures because BLS suppresses their employment count.

### Method

The premium compares what a prevailing wage worker costs per hour with what an open-shop worker costs, counting wages and benefits on both sides:

```math
\text{premium} = \frac{\text{DLIR basic} + \text{DLIR fringe}}{\text{BLS median wage} \times (1 + b)} - 1
```

Here b is open-shop benefits as a share of wages. It is the only input that isn't Oʻahu data, because BLS publishes wages for Honolulu but not benefits. We set **b = 30%**:

- **National construction average: 25%.** In BLS [Employer Costs for Employee Compensation](https://www.bls.gov/ecec/) for Q2 2026, private construction pays $36.13/hr in wages. Leave, insurance and retirement add $8.93/hr, which is 25% of wages. That $8.93 is total benefits ($15.84) minus legally required benefits ($4.42) and overtime and bonuses ($2.49).
- **Hawaiʻi adjustment: +5 points.** The Prepaid Health Care Act requires employers to cover anyone working 20 or more hours a week. That puts open-shop health costs here above the national average.
- **Cross-check:** nationally, non-union private workers get benefits worth 40% of wages ($13.08 on $32.41). That figure includes payroll taxes, so it overstates what fringe covers.

We pick the **median** trade rather than the mean. Painters, roofers and plumbers have premiums above 70%, which pull the mean up.

### Results

At 30% open-shop benefits, the premium ranges from 27% (operating engineers) to 83% (roofers). The **median trade is 45%** and the employment-weighted average is 50%.

| Trade | Premium at b = 30% |
| --- | --- |
| Operating engineer (group 1) | 27% |
| Drywall installer | 29% |
| Cement finisher | 41% |
| Construction laborer (Laborer I) | 43% |
| Electrician (inside wireman) | 43% |
| **Carpenter (median)** | **45%** |
| Sheet metal worker | 46% |
| Iron worker | 47% |
| Plumber | 71% |
| Painter | 82% |
| Roofer | 83% |

The lowest premiums are in the most unionized trades, where the union scale is close to the market wage. Those are operating engineers, drywall installers and cement finishers.

The result depends on the benefit assumption, but every reasonable value lands well above 15%:

| Open-shop benefits (% of wages) | Median trade | Employment-weighted average | Range across trades |
| --- | --- | --- | --- |
| 25% (national construction average) | 50% | 56% | 32–90% |
| **30% (chosen)** | **45%** | **50%** | **27–83%** |
| 40% (high case) | 34% | 40% | 18–70% |
| Basic wage only (fringe ignored) | 14% | 20% | 1–58% |

The last row ignores fringe, so it treats open-shop workers as getting the same benefits as union members. It is a floor, and it is likely how the original 15% was set.

### The 25% labor share

On-site labor is about 22–27% of construction value in Hawaiʻi, from the 2022 Economic Census. No study publishes this share for Oʻahu housing; it is our calculation and should be cited that way.

| Item (Hawaiʻi, all construction, NAICS 23, 2022) | $1,000 |
| --- | --- |
| Wages of construction workers (on-site, up to working foreman) | 1,686,330 |
| Wages of other employees | 780,658 |
| Fringe benefits, all employees | 737,344 |
| Value of construction work | 11,867,002 |
| Value minus work subcontracted in from other firms | 9,828,367 |
| Net value (value minus work subcontracted out) | 8,864,254 |

| Labor measure | Share of construction value |
| --- | --- |
| On-site wages only | 17–19% |
| On-site wages plus their share of fringe benefits | 22–25% |
| Specialty trade contractors (NAICS 238), wages plus about 30% fringe | about 27% |
| All payroll plus fringe, including supervisors and office staff | 33–36% |

Caveats:

- The data covers all construction, including heavy civil work. The multifamily row (NAICS 236116) is withheld for Hawaiʻi.
- Subcontractors with no employees, and out-of-state firms (about $0.96B of work), have no payroll here, so the shares run low.
- Census doesn't split fringe benefits by worker type, so we allocated fringe in proportion to wages.
- A California study using the same method found "just under 22 percent" of hard cost (CAFWD, 2016). Its authors are carpenters' union analysts.
- Estimates of 35–40% of hard cost match total construction payroll, including office staff, not on-site labor.

### Caveats

- **Conservative for small contractors.** BLS medians include union workers, so the true open-shop wage is lower and the premium higher.
- **Wages only.** The 45% leaves out compliance costs and thinner bidding, which studies of total construction cost also pick up.
- **Benefit share is assumed.** 30% is a national figure plus a Hawaiʻi adjustment, not an Oʻahu measurement.
- **Union contractors pay almost no premium.** A developer that already uses a union general contractor would see close to zero.
- **Overtime is not quantified.** HRS § 104-2(c) requires daily and weekend overtime; no estimate was found.

## Sources

- [Ordinance 19-8 (Bill 7, 2019)](https://www.honolulu.gov/dpp/wp-content/uploads/sites/56/2024/07/ORD19-8.pdf): Chapter 32 as enacted, including the definitions of "affordable rental housing project" and "affordable rental housing unit" ([city copy](https://www.honolulu.gov/tod/wp-content/uploads/sites/73/2025/02/Ord_19-08.pdf))
- [Chapter 32 Affordable Rental Housing Program (HHFDC copy)](https://dbedt.hawaii.gov/hhfdc/files/2023/12/2023-1214-III.F.-Ch-32_Affordable-Rental-Housing-Program-SECURED.pdf): ROH § 32-4.2 and § 32-5.2, the grant amounts, unit rule, prevailing wage condition and payout timing; also the property tax freeze during construction (ROH § 8-10.34)
- [Bill 31 (2024), enacted as Ord. 25-19](https://hnldoc.ehawaii.gov/hnldoc/document-download?id=24623): the pre-construction subsidy
- [DPP affordable housing](https://www.honolulu.gov/dpp/planning/affordable-housing/)
- [HHFDC Honolulu County income, rent and sales guidelines](https://dbedt.hawaii.gov/hhfdc/files/2023/06/2023-HONOLULU-COUNTY-Income-Rent-and-Sales-Guidelines.pdf). These may not be a good point of reference for typical rental units; cross-check with similar affordable housing projects (7/20/26).
- [HRS § 104-1](https://www.capitol.hawaii.gov/hrscurrent/Vol02_Ch0046-0115/HRS0104/HRS_0104-0001.htm) and [HRS § 104-2](https://www.capitol.hawaii.gov/hrscurrent/Vol02_Ch0046-0115/HRS0104/HRS_0104-0002.htm): prevailing wage definition, coverage and daily overtime
- [DLIR Wage Rate Schedule Bulletin No. 509 (Sept 15, 2025)](https://labor.hawaii.gov/wsd/files/2025/09/WRS509.pdf)
- [BLS OEWS, Urban Honolulu, May 2025](https://www.bls.gov/oes/current/oes_46520.htm) (series OEUM0046520000000xxxxxx, via the BLS API)
- [BLS Employer Costs for Employee Compensation, Q2 2026](https://www.bls.gov/ecec/) (series CMU2xx2300000000D and the union/non-union series, via the BLS API)
- [DBEDT State Data Book 2024, Section 21](https://files.hawaii.gov/dbedt/economic/databook/db2024/section21.pdf) (Tables 21.05–21.06, 2022 Economic Census EC2223BASIC): the 25% on-site labor share
- [DBEDT, Construction and Hawaii's Economy (2014)](https://files.hawaii.gov/dbedt/economic/data_reports/construction_industry.pdf): Honolulu Construction Cost Index method; labor weights not published
- [CAFWD, Lantsberg & Littlehale (2016)](https://cafwd.org/news/californias-housing-crisis-construction-labor-the-costs-of-multi-family-hou/): California labor share of about 22% of hard cost
