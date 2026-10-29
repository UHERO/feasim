# Housing Policy Simulator logic

This page documents the logic every pathway runs on. All pathways follow the same pipeline and call the same helper functions in `src/calculations/calc-shared.ts`; only the inputs and a handful of pathway-specific rules change. Each [pathway page](README.md#pathways) describes only what differs from this baseline.

# Pipeline

Every pathway's calc file (`calc-bill7.ts`, `calc-standard.ts`, etc.) runs these steps in order:

1. **Envelope and hard costs:** determine buildable area from zoning constraints, split it into residential and commercial, place the parking, size the unit count, and compute construction cost.
2. **Soft costs:** permits, fees, water and wastewater charges, civil, park dedication, construction management.
3. **Financing:** size the construction loan, fund pre-development with equity, accrue construction interest and lease-up carry.
4. **Revenue:** rents (affordable and market), retail, parking and admin income, net to effective gross income after vacancy.
5. **Operating expenses:** a share of effective gross income, plus property tax.
6. **NOI and GDV:** capitalize net operating income into gross development value.
7. **Developer feasibility:** residual land value (`calcDevRLV`), then the strategy (dev flip or hold) and its return metrics.

In the code the steps are numbered slightly differently (sale value and RLV have their own steps), but the order is the same.

# Shared Inputs

Physical inputs (lot size, height, zone class) are user sliders in the Project View but read from parcel records in the Citywide View; every financial and policy input is user-adjustable in both.

| Input | Default | Notes |
| --- | --- | --- |
| Hard cost | $450 per sq ft | Residential construction; retail adds $15 per sq ft |
| Land cost | $130 per sq ft of lot |  |
| Developer equity | 30% | A floor: the realized share rises when the DSCR take-out limits the loan |
| Permanent loan rate | 6.75% (Bill 7: 7.0%) |  |
| Amortization | 30 years |  |
| Minimum DSCR | 1.20 (Bill 7: 1.15) |  |
| Market cap rate | 5.1% | The same for every zone |
| Target return (land carry) | 11.5% |  |
| Hold period | 8 years (Bill 7: 10) | 0 years selects the dev flip strategy |
| Permitting, construction, lease-up | 18, 12 and 9 months | The same for every pathway and zone, in the Project View and the package (no longer set by zone) |
| Operating expense ratio | 30% of EGI (Bill 7 and 201H: 19%) |  |
| Unit mix | All one-bedroom (Bill 7: half studio, half one-bedroom) | Unit sizes: studio 300, one-bedroom 500, two-bedroom 700 sq ft |

***Note:*** when the user chooses AMI 30% for both affordable and market for-sale units, we use the prices listed in HHFDC 2025's [Honolulu County Income, Rent, and Sales Price Guidelines](https://www.dbedt.hawaii.gov/hhfdc/files/2025/05/Honolulu-County-2025.pdf) for AMI 50%, as that is the lowest AMI level listed for sale units.

# Developer Strategies

**Developer flip:** Build, stabilize, and sell. Returns come from the spread between total development cost and stabilized value. Since the developer does not hold the project after stabilization, it takes on no permanent debt. Selected by a hold period of 0 years.

**Developer hold:** Refinance the construction loan into permanent debt at stabilization, collect cash flow over the hold period, and sell at exit. Returns come from cash flow and the sale.

Both are modeled because they represent genuinely different capital sources, and policy incentives do not affect them equally. A 15-year property tax exemption is worth far more to a holder than to a flipper; a fee waiver benefits both about the same.

# Envelope and Hard Costs

The envelope is the building the lot allows: the number of floors the height limit permits, each floor's footprint, and the floor area FAR allows. The model fills it with ground-floor retail, parking and homes, then prices the construction.

## Buildable area

1. **Floors:** Floors = height limit ÷ floor height, rounded down. Floor height is 10 ft in every pathway.
2. **Floor plates:** Each storey's footprint is the smaller of the lot-coverage limit and the area inside the yards, after any height step-back for that storey (see Height Setbacks). The lot is assumed to be twice as deep as it is wide, with the street on the short side.
3. **FAR cap:** Residential plus retail floor area may not exceed FAR × lot area. Parking, loading and lobby are excluded from FAR.
4. **Net area:** 80% of gross residential area is rentable (the efficiency factor); the rest is corridors, stairs, elevators and walls.

```math
\text{buildable area} = \min\left(\text{FAR} \times \text{lot},\ \sum_{\text{storeys}} \text{floor plate}\right)
```

### Lot coverage

| Zones | Standard (post Ord. 26-7), 201H | Before Ord. 26-7 | TOD | Bill 7 |
| --- | --- | --- | --- | --- |
| A-1, AMX-1 | 60% | 60% under 7,500 sq ft, 50% to 20,000 sq ft, 40% above | 60% | 80% |
| A-2, AMX-2 | 60% | Same lot-size scale | 50% | 80% |
| A-3, AMX-3 | 60% | Same lot-size scale | 40% | 80% |
| B-1, B-2, BMX-3, BMX-4 | 100% | 100% | 100% | 80% |
| Waikiki Apartment Precinct and Mixed Use Subprecinct | 100%, less the required open space | Same | Same | 80% |

**Note:** In the Waikiki precincts, 35% of the lot (50% when FAR is 1.5 or more) must stay open, and the stricter of that and the coverage cap governs.

### Retail space

Ground-floor retail is off by default and is turned on with the Use Mix toggle. It is allowed only in the mixed-use zones, up to a share of the lot:

| Zone | Most retail allowed |
| --- | --- |
| AMX-1 | 30% of lot area |
| AMX-2 | 40% of lot area |
| AMX-3, BMX-3, BMX-4, Waikiki Apartment Mixed Use | 60% of lot area |
| A-1, A-2, A-3, B-1, B-2 | None |

Retail built = the smallest of that cap, the Ground-Floor Retail share (default 10%) of the ground floor, and the FAR cap. Retail rent is entered in $ per sq ft per month (default $5; Bill 7 $3) and earns on its net area. Under TOD IPD-T, retail follows BMX-3 uses (§ 21-9.100-5(d)(1)).

### Setbacks

The Setbacks slider (default 10 ft) sets the front, side and rear yards. Step-backs above 40 ft add to the side and rear yards (see Height Setbacks). TOD special districts also keep parking out of the front 40 ft (see [TOD](pathways/tod.md)).

### Floor Area Ratio (FAR)

Each pathway has its own FAR rule; the Max FAR slider shows it and can override it.

| Pathway | FAR |
| --- | --- |
| Standard (post Ord. 26-7) and 201H | Table 21-3.3 as amended by Ord. 26-7: A-1/AMX-1 2.0; A-2/AMX-2 3.0; A-3/AMX-3 and Waikiki 4.0. Business districts keep Table 21-3.4 |
| Before Ord. 26-7 | The older lot-size formulas: FAR rises with lot area up to a cap (A-1/AMX-1 0.9; A-2/AMX-2 1.9; A-3/AMX-3 2.8; Waikiki 1.9). Business districts use Table 21-3.4 |
| Bill 7 | 4.0 |
| TOD | The tier's FAR (see [TOD](pathways/tod.md)) |
| Business districts (Table 21-3.4) | B-1 1.0; B-2 2.5; BMX-3 2.5; BMX-4 4.0; plus the open-space bonus |

#### Open-space bonus (§ 21-3.120-2(c))
B-2, BMX-3 and BMX-4 lots can raise FAR to 3.5, 3.5 and 7.5 by giving up ground as a public plaza. The model takes the full bonus by default in Standard, Before Ord. 26-7, 201H and TOD IPD-T (not PD-T, where the bonus does not apply), and sets aside one sq ft of plaza for every five sq ft of bonus floor area. Example: a 20,000 sq ft BMX-4 lot gets FAR 7.5 and gives up 14,000 sq ft of plaza.

### Unit type and unit mix

The Unit Mix lever picks a blend of unit types; the unit size is the blend's average.

| Unit type | Size (net sq ft) |
| --- | --- |
| Studio | 300 |
| One-bedroom | 500 |
| Two-bedroom | 700 |

Units = net residential area ÷ average unit size, rounded down. Bill 7 also caps units at lot area × 4.0 ÷ the building area per unit (default 800 sq ft), and TOD caps IMX-1 at 10 units under PD-T.

## Height Setbacks 

Several zoning districts require buildings to step back as they get taller. Above a set height, the side and rear setbacks (and in Waikiki the front setback too) grow by 1 ft for every 10 ft of additional height. The model applies this storey by storey, so upper floors get smaller and the building takes a stepped shape. The step-back applies to everything built at that height: ground-floor and podium parking as well as residential floors.

### Rules by zone

| Zone | Rule | Yards affected | Source |
| --- | --- | --- | --- |
| A-2, A-3 | Above 40 ft: +1 ft per 10 ft of height or portion | Side and rear | ROH § 21-3.80-1(c)(2) |
| AMX-2, AMX-3 | Above 40 ft: +1 ft per 10 ft | Side and rear | ROH § 21-3.90-1(c) |
| B-2, BMX-3, IMX-1 | Above 40 ft: +1 ft per 10 ft | Side and rear | Ord. 17-55 |
| BMX-4 | Modeled with the BMX-3 rule | Side and rear | The LUO uses a 65° street-angle plane instead (§ 21-3.120-2(c)); see deviations |
| Resort | Above 30 ft: +1 ft per 10 ft | Side and rear | ROH § 21-3.100-1(c)(3) |
| Waikiki Apartment Precinct and Apartment Mixed Use Subprecinct | Above 40 ft: +1 ft per 10 ft | Front, side and rear | ROH § 21-9.80-5(c)(2) |
| A-1, AMX-1 | None | — | LUO Table 21-3.3 |


### By pathway

| Pathway | Height setback |
| --- | --- |
| Standard (post Ord. 26-7) | The zone's rule |
| Before Ord. 26-7 | The zone's rule |
| TOD | The underlying zone's rule |
| 201H | The underlying zone's rule |
| Bill 7 (ROH Ch. 32) | None. Chapter 32's development standards set "Height setbacks: None" (Ord. 19-8); the pending Bill 72 (2025) keeps this |

### How it is modeled

1. **Storey heights:** Storey k reaches k × floor height. The extra setback for a storey is ⌈(storey top − 40 ft) ÷ 10⌉ × 1 ft, or 0 if the storey ends at or below 40 ft. For the Resort district, use 30 ft instead of 40 ft.
2. **Yards:** The extra setback is added to the side and rear yards (and the front yard in the Waikiki Apartment Precinct). The lot is assumed to be twice as deep as it is wide, with the street on the short side: storey footprint = (lot width − 2 × side yard) × (lot depth − front yard − rear yard), capped at the lot-coverage limit.
3. **Physical envelope:** Ground floor, podium parking and residential floors each use their own storey's footprint. Residential floor area is the sum of the residential storeys' footprints, still capped by FAR.

### Worked example

A BMX-3 lot of 10,000 sq ft with 10 ft yards and a 150 ft height limit:

| Storey (top) | Footprint | Extra side and rear setback |
| --- | --- | --- |
| 1–4 (up to 40 ft) | 6,157 sq ft | 0 |
| 5 (50 ft) | 5,866 sq ft | 1 ft |
| 10 (100 ft) | 4,468 sq ft | 6 ft |
| 15 (150 ft) | 3,170 sq ft | 11 ft |

With no parking and FAR not limiting the building, the step-back reduces the project from 147 to 118 units. The effect is usually small: on most lots, lot coverage or FAR limits the building before the step-back does. It matters most for tall buildings on narrow lots.

### Deviations and what is not modeled

- BMX-4 uses the BMX-3 step-back in place of its actual 65° street-angle plane.
- Transitional setbacks next to residential or apartment lots are not modeled; they depend on each parcel's neighbors.
- Waikiki coastal height setbacks (no structures within 100 ft of the certified shoreline, then a 1:1 plane) are not modeled; the parcel data has no shoreline distance.
- TOD and 201H modifications are not modeled. Council can modify or exempt height setbacks for IPD-T/PD-T and 201H projects, but the model applies the underlying zone's rule.
- The Bill 18 draft rule (step-back above 40 ft on buildings over 75 ft) is not current law. Bill 18 scenarios can still be run by setting the step-back inputs directly.
- Lot shape is always assumed to be twice as deep as it is wide, with frontage on the short side.

## Construction costs

Construction costs are based on the user's input; the default is $450 per sq ft for every pathway. These costs cover labor, materials, site preparation, design and contractor overhead.

```math
\text{hard cost} = (\text{residential} + \text{lobby}) \times \text{rate} + \text{retail} \times (\text{rate} + \$15) + \text{parking cost}
```

- **Escalation:** Hard costs rise 5.6% a year to the construction midpoint (permitting months + half the construction months), since the average dollar is spent then.
- **Contingency:** A 10% contingency is added to hard costs when the loan is sized.
- **Bicycle parking:** Racks and lockers ($225 and $1,250 per space) in every pathway that requires bicycle parking; see Parking and Loading.

### Contractor costs

The model has no separate general-contractor fee line: contractor overhead and profit are inside the $ per sq ft hard cost. Construction management is a soft cost at 3% of hard cost, and the developer's profit is a 15% margin used in the residual land value (see Developer Feasibility).

## Parking and Loading

The model builds the off-street parking and loading that ROH Chapter 21, Article 6 requires, and places it where a typical developer would: a surface lot if the stalls fit beside the building, otherwise the ground floor, then whole podium floors. Parking counts toward the height limit but not toward FAR, so when height is the limit podium floors replace homes, and when FAR is the limit parking mainly adds cost.

### Requirements by pathway

| Pathway | Housing stalls | Retail stalls | Joint use | Loading spaces | Basis |
| --- | --- | --- | --- | --- | --- |
| Standard (post Ord. 26-7) | 1 per 1,000 sq ft of dwelling area | 1 per 500 sq ft | 90% when both | Yes, lots over 7,500 sq ft | § 21-6.20, Tables 21-6.1, 21-6.2, 21-6.5 |
| Before Ord. 26-7 | 1 per 1,000 sq ft of dwelling area | 1 per 500 sq ft | 90% when both | Yes, lots over 7,500 sq ft | Same |
| 201H | 1 per 1,000 sq ft of dwelling area | 1 per 500 sq ft | 90% when both | Yes, lots over 7,500 sq ft | Same: no exemption assumed, since HRS § 201H-38 exemptions are granted project by project |
| TOD (IPD-T and PD-T) | None | None | Loading only | Yes, lots over 7,500 sq ft | § 21-6.20(a): no parking within 0.5 miles of a rail station or in a TOD special district; loading is not exempted |
| Bill 7 (ROH Ch. 32) | None | None | n/a | None, but loading and garbage storage must fit on site | Ord. 19-8, § 32-2.3 |

#### Exempt parcels
§ 21-6.20(a) requires no parking in the Primary Urban Center and Ewa development plan areas (except residential, agricultural and preservation districts) or within 0.5 miles of a rail station. Each Standard, Before Ord. 26-7 and 201H parcel in the Citywide View carries `parking_exempt`; 6,998 of 9,444 are exempt. An exempt parcel needs no housing or retail stalls but still needs loading (§ 21-6.110 is not exempted). "Residential districts" means R-3.5 to R-20 only; apartment and apartment mixed-use are separate district classes, so no modeled parcel falls into the carve-out. The Project View has no parcel, so it always applies the minimum.

Retail uses the Commercial 1 rate (retail and sales, eating and drinking, offices). The model builds only housing and ground-floor retail, so the industrial (1 per 2,000 sq ft), Commercial 2 (1 per 1,000 sq ft), hotel and assembly rates in Table 21-6.1 are not used; housing in resort and industrial zones takes the residential rate.

#### Impact of the exemption
Citywide View totals at default levers, retail off, with the Article 6 minimum applied to every parcel and then with the § 21-6.20(a) exemption applied:

| Pathway | Parcels | Stalls without → with exemption | Units without → with exemption | Parcels rated strong without → with exemption |
| --- | --- | --- | --- | --- |
| Standard (post Ord. 26-7) | 9,444 | 623,728 → 120,384 | 1,243,569 → 1,444,875 | 176 → 5,159 |
| Before Ord. 26-7 | 9,444 | 445,399 → 78,049 | 886,336 → 1,022,077 | 93 → 1,987 |
| 201H | 9,444 | 623,825 → 120,384 | 1,243,743 → 1,444,863 | 59 → 4,211 |
| TOD (Base) | 2,810 | 0 (no minimum) | 509,445 | 1,474 |

Dropping stalls from the 74% of parcels that are exempt frees ground and podium floors for units, and each stall costs more to build than its $100 monthly rent repays, so the exemption moves thousands of parcels into strong. TOD requires no car parking, so it has no exemption to apply.

### Counting stalls

```math
\text{stalls} = \operatorname{round}\left(j \times \left(r \times \text{units} + \frac{\text{retail sq ft}}{500}\right)\right)
```

- **r:**, stalls per unit, is the Parking lever. Its default is the legal minimum: the unit mix's average private dwelling area ÷ 1,000. Common areas and accessory recreation areas are excluded (§ 21-6.20(b)(2)(A)), so the unit sizes alone count: studio 300, one-bedroom 500, two-bedroom 700 sq ft.
- **j:** is 0.9 when housing and retail both need stalls (Table 21-6.2, residential with retail/commercial), else 1.
- A fraction of 0.5 or more rounds up (§ 21-6.20(b)(1)).

| Unit mix | Average private area (sq ft) | Minimum stalls per unit |
| --- | --- | --- |
| All studios | 300 | 0.30 |
| 75% studios, 25% one-bedroom | 350 | 0.35 |
| Half studios, half one-bedroom | 400 | 0.40 |
| 25% studios, 75% one-bedroom | 450 | 0.45 |
| All one-bedroom (default) | 500 | 0.50 |
| Thirds of studio, one- and two-bedroom | 500 | 0.50 |
| Half one-bedroom, half two-bedroom | 600 | 0.60 |
| All two-bedroom | 700 | 0.70 |

**Example:** 40 one-bedroom units over 2,000 sq ft of retail need 0.9 × (20 + 4) = 21.6, so 22 stalls.

### Loading spaces (§ 21-6.110, Table 21-6.5)

| Use | Size | Spaces |
| --- | --- | --- |
| Multifamily | 20 to 150 units | 1 |
| Multifamily | 151 to 300 units | 2 |
| Multifamily | Each additional 200 units or major fraction | +1 |
| Retail | 2,000 to 10,000 sq ft | 1 |
| Retail | 10,001 to 20,000 / 20,001 to 40,000 / 40,001 to 60,000 sq ft | 2 / 3 / 4 |
| Retail | Each additional 50,000 sq ft or major fraction | +1 |

Lots over 7,500 sq ft reserve ground for these spaces, with the same 90% joint-use rate and half-up rounding (§ 21-6.110(b)(3)). One space is 19 ft by 8 ft 6 in (161.5 sq ft); when more than one is required, a third of them (rounded half up) are 35 ft by 12 ft (420 sq ft) (§ 21-6.130(a)). Loading takes ground area in the parking area and is costed as parking: surface rate on a surface lot, structured rate inside the building. The count is sized for the most units the lot can hold, before parking takes any floor area, so it never falls short. Results report it as `loading_spaces`.

### Bicycle parking (§ 21-6.40, Table 21-6.3)

Bicycle parking is required in the apartment, AMX, business, BMX, resort and Waikiki districts (§ 21-6.40(a)), so the model adds it in Standard, Before Ord. 26-7, 201H and TOD, except on industrial-zoned TOD parcels. Bill 7 is exempt (Ord. 19-8). The § 21-6.20(a) parking exemption covers car parking only, so exempt parcels still provide bicycle parking.

| Use | Short-term | Long-term |
| --- | --- | --- |
| Residential | 1 per 10 units | 1 per 2 units |
| Commercial (ground-floor retail) | 1 per 2,000 sq ft or portion, or 1 per 10 vehicle spaces or portion, whichever is greater | 1 per 12,000 sq ft, or 1 per 30 vehicle spaces or portion, whichever is greater |

- **Vehicle spaces:** in the commercial rate are the retail's own car stalls (1 per 500 sq ft, before the joint-use reduction; none on exempt parcels).
- **Rounding:** "or portion" rounds up; the total for each type rounds a fraction of 0.5 or more up (§ 21-6.40(b)).
- **Space size:** 2 ft × 6 ft plus the 5 ft clear zone on the 2 ft access side, 22 sq ft per space (§ 21-6.40(d)(1)). The area is set aside in the parking area with the loading spaces and costed as parking.
- **Count basis:** like loading, the count is sized for the most units the lot can hold, so it can run a few percent above the units built.

**Example:** 40 one-bedroom units over 2,000 sq ft of retail need 5 short-term and 21 long-term spaces, 572 sq ft and $27,375 of racks and lockers.


#### Deviation and what is not modeled
the Industrial and Hotel rows of Table 21-6.3 (the model builds no industrial office space or hotel rooms), vertical or stacked spaces (allowed at 4 ft deep and high, which would need less floor area than the 22 sq ft assumed), the location rules of § 21-6.40(d)(2)–(5), the § 21-6.40(e) 15,000 sq ft relief, and substituting extra bicycle spaces for car stalls (§ 21-6.30(h)(2)).

### Placement and cost

| Placement | Where it is | Area per stall | Rate | Cost per stall |
| --- | --- | --- | --- | --- |
| Surface lot | Open ground the building leaves inside its buildable footprint | 360 sq ft | $30 per sq ft | $10,800 |
| Ground floor | Inside the building's ground floor (tuck-under), behind any retail | 330 sq ft | $190 per sq ft | $62,700 |
| Podium | Whole parking floors between the ground floor and the housing | 330 sq ft | $190 per sq ft | $62,700, plus the empty part of the top podium floor, which is built whole |

1. **Surface lot first:** The building is made as slim as the floor area allows. If every stall and the loading fit on the open part of the ground plate, they become a surface lot and the building keeps all its units. Surface parking stays inside the yards and the lot-coverage area (§ 21-6.80(a)).
2. **Then inside the building:** Retail (when on) takes its share of the ground floor, then stalls at 330 sq ft each. A leftover ground floor at least one unit's gross size becomes housing; anything smaller is lobby, charged at the residential hard cost.
3. **Podium floors:** Stalls that don't fit go on whole podium floors above. For each podium height the model finds the most units whose stalls still fit, and keeps the arrangement with the most units. More parking therefore never produces more units. The unit count is found by a direct search for the most units whose stalls still leave room for them; an earlier version stepped down from an upper bound and could stop short (one 248,815 sq ft A-2 lot showed 597 units where 628 fit), and the fix raised units 0.1–0.6% depending on the pathway.
4. **TOD special districts (PD-T):** No stalls or loading within 40 ft of the front lot line (§ 21-9.100-8(c)); see [TOD](pathways/tod.md).
5. **Income:** Stalls × $100 per month × 12, added to potential gross income.

Ground-floor and podium stalls cost the same per square foot. What separates them is housing: ground-floor stalls take space that could be a unit or lobby, and podium floors take whole floors under the height limit.

#### Why the defaults use the ground floor 
At the Standard defaults (A-1, 10,000 sq ft, 30 ft), 60% lot coverage gives 6,000 sq ft floor plates, and three floors hold 18,000 sq ft. FAR 2 allows 20,000 sq ft, so the building fills its whole ground plate and no open ground is left for a surface lot. The 11 stalls go inside: about $690,000, plus about $102,000 for the 536 sq ft of loading and bicycle area and $18,175 of racks and lockers. As a surface lot they would cost $10,800 each, $118,800 in all. Units fall from 27 with no parking to 22.

Surface parking appears when FAR, not height or coverage, limits the building, so a slimmer building leaves ground open: a tall height limit with a low FAR. Across the Citywide View's parcels at default settings (43,110 runs: every parcel in each pathway, and TOD at each tier its regime offers), 1,778 runs use a surface lot, 5,540 use ground-floor stalls and 1,760 use podium stalls. The model never puts surface stalls on the part of the lot that lot coverage keeps unbuilt (about 4,000 sq ft on the default lot); allowing that would be a modeling change.

### Levers and warnings

The Parking lever follows the legal minimum until the user moves it, and a lever set below the minimum is allowed but flagged.

- **No exemption toggle:** Neither view has a switch for the exemption, by decision: the Citywide View reads it from each parcel, and the Project View, which has no parcel, always applies the minimum.
- **Below the minimum:** A lower value is modeled as if a variance were granted. The Project View's status line says "Parking below the Article 6 minimum of X stalls per unit (§ 21-6.20)", and the Citywide View's parcel card shows a "Parking below legal minimum" tag, both in the warning orange.
- **Retail stalls:** switch on with retail (1 per 500 sq ft, with the 90% joint-use rate) and are always required on a non-exempt parcel; the lever sets housing stalls only. On an exempt parcel retail stalls stay at 0 whatever the lever says.
- **Joint use:** also applies to a ratio the user sets by hand.
- **Retail sliders:** Retail Rent and Ground-Floor Retail % appear only when the use mix includes retail, in both tools.

### Deviations or what is not modeled

- Underground or basement parking, tandem stalls, mechanical stackers and partial podium floors.
- Mixing parking types: stalls are all in a surface lot, or all on the ground floor and podium.
- Small retail at 1 per 1,000 sq ft: all retail uses 1 per 500 sq ft.
- Unbundled parking relief (§ 21-6.30(h)(1)); the 15,000 sq ft additional-floor-area relief for parking, loading and bicycle parking (§ 21-6.30(k), § 21-6.120(d), § 21-6.40(e)), read as applying to additions to existing buildings; and substituting extra bicycle spaces for car stalls (§ 21-6.30(h)(2)), all by decision.
- The mixed-use loading rule (§ 21-6.110(b)(1)) and loading maneuvering area.
- Surface lot landscaping (§ 21-6.80(b): a 5 ft landscape strip along streets and a canopy tree for every 6 stalls on lots of more than 10 stalls), which slightly overstates how many stalls fit, and stall layout by floor shape.
- Loading maneuvering room and access: only the space itself (161.5 or 420 sq ft) is counted.

# Soft Costs

Soft costs are every development cost that is not construction: permits, plan review, water and wastewater charges, school impact fees, civil permits, park dedication, and construction management. They are summed in `calcSoftCosts`.

| Line | How it is calculated |
| --- | --- |
| Building permit | Chargeable units × the permit fee for one unit's construction value (ROH fee schedule: $20 up to $500 of value, scaling to $4,300 + $4.50 per $1,000 above $2 million) |
| Plan review | 10% of the permit fee per chargeable unit, at least $200 and at most $25,000 |
| Wastewater system facility charge | Chargeable units × ESDU per unit (0.7 for projects of 5 or more units, else 1.0) × $7,539 |
| BWS water system facilities charge and new meter | See BWS Water Charges below |
| Environmental (EA and EIS) | $600 + $1,200 |
| Temporary certificate of occupancy | $200 |
| Erosion and sediment control plan | $250 |
| Utilities (trench and service connection) | $245 per unit |
| Grubbing, grading and stockpiling permits | By lot area and excavated volume (lot area × excavation depth by zone) |
| School impact fee | Set to $0 (see below) |
| Park dedication | See below |
| Construction management | 3% of hard cost |
| TOD only: zoning application and special district permit | $15,000, plus $1,200 plus $300 per acre (at most $15,400) |

## Fee waivers

Fee waivers are implemented by charging fees on a reduced chargeable unit count rather than by applying a separate percentage discount. The Impact Fees toggle sets which units pay the building permit, plan review, wastewater and BWS charges:

| Toggle | Units charged |
| --- | --- |
| Market Units Only (default except Bill 7) | Market units; affordable units are waived |
| All | Every unit |
| Exempt (Bill 7 default) | None |

Bill 7's building permit and plan review waiver, for example, is proportional to the affordable share. Each pathway's waivers are listed on its [pathway page](README.md#pathways).

### Park dedication

Park land is charged only on units not exempt under § 22-7.3(j); in other words only market units count toward the park dedication requirement. The requirement is the lesser of 110 sq ft per unit and 10% of floor area. The Park Dedication toggle sets how it is paid: in lieu (a $200 application fee plus the land value of the required area at the land cost) or exempt (no cost). Bill 7 units are fully exempt from park dedication (ROH 43-10.8).

### Wastewater system facility charges

Charged per equivalent single-family dwelling unit (ESDU) at $7,539. Projects of 5 or more units count 0.7 ESDU per unit; smaller projects 1.0. Affordable units are waived under most pathways (see each [pathway page](README.md#pathways)).

### School impact fees

School impact fees are a state assessment (HRS Chapter 302A), not a City fee, so no pathway's City waivers reach them. The model currently sets them to $0 per unit (instead of $1,836), and the Impact Fee input can set a value.

### Construction management

Construction management is 3% of hard cost, in every pathway.

## BWS Water Charges: Water System Facilities Charge and New Meter Cost

The Housing Policy Simulator includes two one-time Board of Water Supply (BWS) charges. Both are soft costs inside total development cost, and both are paid at building permit submission:

- **Water System Facilities Charge (WSFC):** a capacity charge levied per fixture unit (FU).
- **New meter cost:** the one-time fire service connection charge, set by fire meter size.

Both apply in every pathway, and both are controlled by the Impact Fees toggle, the same way as the wastewater, building permit and plan review fees.

### 1. Water System Facilities Charge

```math
\text{WSFC} = (\text{project fixture units} - \text{fixture units of waived units}) \times \text{rate per fixture unit}
```

#### Rate
The rate depends on the number of residential stories built. BWS has two multi-family brackets and no mid-rise bracket:

| Per fixture unit (minimum 20 FU) | Resource development | Transmission | Daily storage | Total |
| --- | --- | --- | --- | --- |
| Single-family residential | $80.04 | $37.87 | $67.42 | $185.33 |
| Multi-family, low rise (3 stories or fewer) | $117.14 | $55.46 | $98.67 | $271.27 |
| Multi-family, high rise (4 stories or more) | $88.14 | $41.73 | $74.25 | $204.12 |

- **Minimum:** BWS charges at least 20 fixture units per application. This only binds on very small projects (two units or fewer).

### 2. Fixture units per dwelling unit

Fixture units come from the BWS Fixture Unit Computation Worksheet. The model uses the low-flow column because BWS staff confirmed that all new fixtures are low-flow. BWS staff also confirmed it sets no maximum number of fixture units per dwelling unit, so the charge scales linearly with the fixtures. The regular-flow column applies only to existing fixtures on a retrofit or segregation, never to new construction, and the two columns diverge most on the fixtures that dominate a dwelling unit:

| Fixture | Regular | Low flow |
| --- | --- | --- |
| Lavatory (bathroom sink) | 1.0 | 0.6 |
| W.C. tank (toilet) | 3.0 | 1.7 |
| Tub/shower combo or shower only | 2.0 | 1.6 |
| Kitchen sink | 2.0 | 1.6 |
| Dishwasher | 1.5 | 1.5 |
| Washing machine | 2.0 | 2.0 |
| Hose bibb | 2.5 | 2.5 |


| Building block | Fixtures | FU |
| --- | --- | --- |
| Full bath | Toilet 1.7 + lavatory 0.6 + tub/shower 1.6 | 3.9 |
| Half bath | Toilet 1.7 + lavatory 0.6 | 2.3 |
| Kitchen | Kitchen sink 1.6 | 1.6 |
| Laundry | Washing machine 2.0 | 2.0 |

| Unit type | Baths assumed | FU per unit |
| --- | --- | --- |
| Studio | 1 | 7.5 |
| 1BR | 1 | 7.5 |
| 2BR | 1.5 | 9.8 |
| 3BR / 4BR | 2 | 11.4 |

Only fixtures count, not bedrooms. A unit mix (for example 50% 1BR / 50% 2BR) uses the weighted average of its unit types.

| Unit type | FU | Low-rise charge per unit | High-rise charge per unit |
| --- | --- | --- | --- |
| 1 bath | 7.5 | $2,034.53 | $1,530.90 |
| 1.5 bath | 9.8 | $2,658.45 | $2,000.38 |
| 2 bath | 11.4 | $3,092.48 | $2,326.97 |

#### Validation against BWS's own examples 
BWS's 2021 WSFC proposed-changes pamphlet gives 138 FU for 10 low-rise units, 414 for 30, 516 for 40 high-rise units and 1,290 for 100. Both per-unit figures reconcile to the worksheet exactly, which checks the worksheet values and the method:

- Low-rise 13.8 FU = 1.5 baths (6.2) + kitchen sink 1.6 + dishwasher 1.5 + washer 2.0 + hose bibb 2.5
- High-rise 12.9 FU = 2 baths (7.8) + kitchen sink 1.6 + dishwasher 1.5 + washer 2.0, no hose bibb

The totals are exact multiples of the per-unit figures, so BWS's examples carry no common-area allowance, which is why the model sets common-area fixtures to zero. The model's fixture set is lighter than BWS's (see Assumptions and known deviations).

### 3. Residential stories

Both the WSFC rate and the fire meter size depend on the stories the project actually builds, not the number of floors the height limit allows:

```math
\text{residential stories} = \left\lceil \frac{\text{gross residential floor area}}{\text{floor plate}} \right\rceil
```

The floor plate is the smaller of the lot coverage footprint and the setback footprint. Ground-floor retail area is excluded. When FAR is the binding limit, the building has fewer stories than the height limit allows, and that can move it from the high-rise to the low-rise bracket.

### 4. New meter cost (fire service connection)

BWS charges a one-time fire service connection fee based on fire meter size (BWS Fire Protection Rates). Fire-only services carry no fixture units and are exempt from WSFC, so this charge is the entire cost of the fire connection. Meter size is assumed from residential stories:

| Residential stories | Fire meter size (assumed) | Charge |
| --- | --- | --- |
| 1–3 | 4" | $5,600 |
| 4–6 | 6" | $12,100 |
| 7 and above | 8" | $21,100 |

The BWS table also has rows for smaller meters, from 5/8" ($500) to 2" ($1,700), and no 3" row. It is a single undated column, so it does not step by year. A sprinklered building also needs a domestic service, whose installation charge BWS does not publish (see What is not modeled).

### 5. Waivers and the Impact Fees toggle

BWS may waive WSFC and new meter charges for affordable or homeless dwelling units certified by the appropriate City and County of Honolulu agency. The waiver is a BWS Board policy (September 2018), not a City ordinance. It is keyed to unit certification rather than to a pathway, so it can reach Bill 7, 201H, TOD (PD-T/IPD-T) and Chapter 29 affordable units alike.

| Toggle setting | WSFC | New meter cost |
| --- | --- | --- |
| Market Units Only | Charged on market units; affordable units are waived, up to 500 units per project | Charged on the market units' share of all units |
| All | Charged on every unit | Charged in full |
| Exempt | Waived on every unit (Bill 7 default) | Waived |

Bill 7 defaults to Exempt. If its toggle is set to All, Bill 7 projects pay both charges in full. The two charges are waived on different bases:

- WSFC is waived on the fixture units of the waived units.
- The meter charge is waived in proportion to the waived units' share of total units. For example, with 25% of units waived, the project pays 75% of the meter charge.

The waiver covers the facilities charge and meter cost only. The monthly customer and quantity charges have no waiver, so a waived project pays nothing up front but the full water bill for the life of the building. The model assumes the meter waiver reaches the fire meter, since that is the only meter charge BWS publishes; if it covers only the domestic meter, the difference is about $121 per unit on a 100-unit building with a 6" fire meter.

### 6. No cost escalation

WSFC has been flat for over a decade, so neither charge is escalated. The model's construction cost inflation applies to hard costs only.

### Worked examples

| Example | Fixture units | WSFC | Fire meter | Total |
| --- | --- | --- | --- | --- |
| 1. 40 one-bedroom units, 5 residential stories, toggle All | 40 × 7.5 = 300 FU | 300 × $204.12 = $61,236 | 6": $12,100 | $73,336 ($1,833 per unit) |
| 2. Same project, 10 affordable units, Market Units Only | 300 − 10 × 7.5 = 225 FU | 225 × $204.12 = $45,927 | $12,100 × 30/40 = $9,075 | $55,002 |
| 3. 8 two-bedroom units, 3 residential stories, toggle All | 8 × 9.8 = 78.4 FU | 78.4 × $271.27 = $21,267.57 | 4": $5,600 | $26,867.57 |
| 4. 100 two-bath units, high-rise, toggle All | 100 × 11.4 = 1,140 FU | 1,140 × $204.12 = $232,697 | 6": $12,100 | $244,797 ($2,448 per unit) |

### What is not modeled

- **Monthly customer and quantity charges:** Operating expenses are calibrated from comparable properties, so these monthly charges are already inside them. Modeling them separately would double-count.
- **Domestic water meter installation charge:** BWS sets this annually and does not publish it, so it is excluded.
- **The islandwide 500-unit annual pool:** BWS's affordable waiver is limited to 500 dwelling units per fiscal year (July 1 to June 30) across all projects islandwide, and BWS testified that the year's allocation had already been used up. The model instead applies the 500 units as a cap per project and assumes the project secures an allocation.
- **Deferral when the pool is exhausted:** Once the allocation is gone, BWS may defer WSFC and installation fees until the meter is installed (BWS Rules §§ 1-102, 2-202) instead of waiving them. A deferral is worth only the carrying-cost savings. It is not modeled.
- **Waiver sunset (June 30, 2029):** The model has no permit submission date, so the waiver is always treated as available.
- **Single-family WSFC rate ($185.33 per FU).** Not used; all projects are priced as multi-family housing.
- **Common-area fixtures:** Lobby restrooms, janitor sinks and amenity areas are set to zero, matching BWS's worked examples. A real permit application lists every fixture, so a high-rise with common-area restrooms would pay more.
- **Adaptive reuse and conversions:** These pay WSFC only on new fixture units added. The model covers new construction only.

### Assumptions and known deviations

- The fixture set is lighter than BWS's own typical unit, which leaves out the dishwasher and hose bibb. This is a deliberate choice for deep-affordable product, so the model's WSFC is a lower-end estimate:

|  | BWS published | Model | Difference |
| --- | --- | --- | --- |
| Low-rise, 1.5 bath | 13.8 FU | 9.8 FU | −4.0 FU (−$1,085 per unit) |
| High-rise, 2 bath | 12.9 FU | 11.4 FU | −1.5 FU (−$306 per unit) |

- Fire meter size is assumed by story count, not taken from a fire protection engineer's sizing.
- Baths per unit type are assumed (studio and 1BR: 1 bath; 2BR: 1.5 baths; 3BR and above: 2 baths).
- The 500-unit waiver cap is applied per project, not islandwide, and the project is assumed to receive its allocation.

## Land and Total Development Cost

**Land:** Land is a project cost line item, shown alongside hard and soft costs: land cost per sq ft (default $130) × lot area. It is paid at the start, with equity.

**Total development cost:** Total development cost accumulates hard costs (with the 10% contingency), soft costs, financing costs and land:

```math
\text{TDC} = 1.1 \times \text{hard cost} + \text{soft cost} + \text{financing cost} + \text{land}
```

Financing cost is the real debt cost: the loan fee (0.75% of the construction loan), construction interest and lease-up carry.

## Financing

Financing follows the project timeline in three phases: pre-development, construction, and stabilized operation. Each phase draws on a different capital source and carries a different cost; rather than collapsing these into one blended cost of capital, the pipeline prices each phase separately and rolls the results into total development cost and, for the hold strategy, into post-stabilization cash flow.

### Pre-development equity

Pre-development costs (permits, entitlements and other soft costs incurred before construction starts) are carried entirely on equity; no debt is drawn until the construction loan closes. The model spends 10% of construction cost (hard plus soft) evenly over the permitting months, after the land purchase:

```math
\text{monthly pre-development spend} = \frac{0.10 \times (\text{hard} + \text{soft})}{12}
```

There is no separate carry rate: the cash flows are timed month by month, and the levered IRR prices the cost of that time. (This answers the earlier question of whether the carry compounds at the target return: it does not.) The equity draws go first to land, then to pre-development spending, and the rest is paid in at loan closing.

### Construction loan

The construction loan is sized as a share of the amount to finance (loan-to-cost), with the balance funded by equity:

```math
\text{loan} = (1 - \text{equity share}) \times (1.1 \times \text{hard} + \text{soft} + \text{land})
```

The loan draws over the construction months on an S-curve (slow start, fast middle, slow finish), and interest accrues monthly at 8% a year on the drawn balance plus the interest already accrued, not on the full loan from closing. Since the project produces no income before stabilization, construction interest is capitalized into total development cost. The 0.75% loan fee is due at closing and paid in equity.

**Two loans:** The model sizes the loan twice. The residual land value uses a loan sized on construction cost only, since land is what it solves for; the deal returns (return on cost, IRR, equity multiple) use a loan sized on construction cost plus land.

***Note:*** the equity slider (default 30%) is a floor on the developer's share of total cost (land, hard and soft). When the DSCR take-out cannot retire a loan of that size, the lender lends less and the realized equity share rises above the slider.

### Lease-up carry

When construction finishes the building is not yet at full income. Lease-up carries the project to 90% occupancy, absorbing 20 units a month plus 3 months to stabilize, unless the Lease-up Months lever is set (default 9). The construction loan balance keeps accruing interest during lease-up until it is refinanced (hold) or paid off at sale (flip).

### Permanent financing (hold strategy only)

At stabilization, hold-strategy projects refinance the construction loan into a permanent loan. The permanent loan is the smaller of:

- **The construction loan balance** to be retired, and
- **The debt-service-coverage limit:** year-one NOI (after property tax) ÷ annual debt service must be at least the minimum DSCR (default 1.20; Bill 7 1.15).

Debt service uses a 30-year amortization at a 6.75% permanent rate (Bill 7: 7.0%), both user inputs. DSCR is a financeability gate, not a return: it sets the most debt the project can carry. When the permanent loan falls short of the construction balance, the developer funds the gap with more equity. The construction loan is sized so its balance at stabilization does not exceed this take-out, which is why the realized equity share can exceed the slider.

**Entry cap:** The market cap rate (default 5.1% for every zone) values the building at stabilization. It anchors gross development value and the return-on-cost benchmark.

**Exit cap:** The exit cap values the building at sale after the hold period: the entry cap plus 50 basis points. A buyer further out from stabilization is pricing an older asset in a less certain market and demands a higher yield than a buyer of a new building.

### Cash flow by developer strategy

**Flip:** The developer sells immediately after lease-up, in a single lump sum:

```math
\text{proceeds} = \text{GDV} - \text{selling costs (3.5\%)} - \text{outstanding loan balance}
```

**Hold:** The developer holds the building for the hold period, then sells:

- **Each year:** NOI minus permanent debt service. Rents grow 4% a year, affordable and market alike (see [Rent growth](#rent-growth)), operating expenses 3.5%, and assessed value 2%.
- **At exit:** the next year's NOI ÷ exit cap, less 3.5% selling costs and the remaining loan balance.
- **Bill 7 and TOD** pay property tax on land only for the first 15 years (see Property Tax).

## Revenue

### AMI unit rent

Every rent in the model, affordable or market, is an AMI-based rent from the HHFDC Honolulu County income limits:

```math
\text{monthly rent} = \left\lfloor \frac{0.30 \times \text{household income at the AMI level}}{12} \right\rfloor
```

- **Household size by unit type:** studio 1 person; one-bedroom the average of 1 and 2 persons; two-bedroom 3 persons.
- **Unpublished AMI levels:** scale the 50% AMI row linearly. HHFDC publishes rents floored, so the model floors too.
- **Unit mix:** the rent is the weighted average over the mix.
- **Escalation:** Affordable and market rents both grow 4% a year from today through permitting, construction and lease-up, and through the hold (see [Rent growth](#rent-growth)).

### Affordable vs market rent

Each unit is either affordable or market:

- **Affordable units:** rent at the Affordable Unit Rent level (default 80% AMI).
- **Market units:** rent at the Market Unit Rent level, which stands in for market rent (default 120% AMI; Bill 7 100%).

| Pathway | Affordable share of units |
| --- | --- |
| Bill 7 | 80% |
| 201H | The Affordability input, at least 50% + 1 unit (default 51%) |
| Standard, Before Ord. 26-7, TOD | 0%: the model is rental only, and the Chapter 29 requirement applies to for-sale projects (see each [pathway page](README.md#pathways)) |

### Rent growth

Affordable and market rents both grow 4% a year: Honolulu's HUD income limits, which set the affordable rent caps, grew 4.4% a year from 2015 to 2026, and market rents grew 3.6% to 4.3% a year. The constants are `FINANCING.ami_escalation` (to lease-up) and `HOLD.annual_rent_growth` (over the hold) in `src/calculations/calc-shared.ts`.

#### The Chapter 32 rent cap moves every year
[ROH § 32-1.1](https://dbedt.hawaii.gov/hhfdc/files/2023/12/2023-1214-III.F.-Ch-32_Affordable-Rental-Housing-Program-SECURED.pdf) requires that "for a period of at least 15 years after a certificate of occupancy is issued … the affordable units are rented at or below the rental rate limits established by [HUD] for households earning 100 percent of the AMI." It defines AMI as "the current AMI determined by [HUD] annually." Nothing ties the cap to the year of application or permit, so it rises while a project waits in permitting. The 15-year restriction outlasts the model's 10-year hold, so the cap applies for the whole hold. The model's rent formula matches DPP's published maximums:

| 100% AMI, DPP 2026 | Income limit | Maximum rent (DPP) | 30% × income ÷ 12 |
| --- | --- | --- | --- |
| Studio (1 person) | $107,800 | $2,695 | $2,695 |
| One-bedroom (1–2 persons) | $115,500 (average) | $2,887 | $2,887 |

**Affordable rents follow HUD income limits:** Honolulu's median family income grew 4.05% a year from 2015 ($86,900) to 2025 ($129,300), and the income limits that set rent caps grew 4.4% a year from 2015 to 2026. The 2026 increase of 1.3% followed a 9.2% year. HUD caps any single year's increase at 10%, and the limits used for these projects don't fall. Since 2020, growth has averaged 3.4% a year.

### Other income

- **Parking:** stalls × $100 per month × 12.
- **Administrative:** 30% of units × a $50 application fee plus 70% × a $200 lease renewal fee, each year.
- **Retail:** net retail area × retail rent per sq ft per month × 12, escalated like market rent.

### Vacancy and effective gross income

Residential income (rents, parking, admin) loses 7.4% to vacancy; retail loses 12.6%. What remains is effective gross income (EGI).

***Note:*** for-sale units are currently hidden across all pathways (since 8/26/26). When sale units are re-enabled, note that the AMI floor for affordable sale units is 50%, because HHFDC does not publish sale price guidelines below that level.

## Operating Expenses

Operating expenses are modeled as a percentage of effective gross income, and represent the cost of management, insurance, maintenance, etc. after stabilization. In Honolulu, 19–20% is typical for affordable projects with a GET exemption (4.712% burden); 24–25% is more typical of market projects. The model's default is 30% of EGI, and 19% for Bill 7 and 201H. The ratio is a user slider and excludes property tax, which is modeled separately.

**General Excise Tax (GET) exemption:** GET is a tax on gross business receipts; it is charged on the seller, the contractor, architect, lender, property manager, and typically passed through in the price. On Oahu it is 4.5% (4% state plus the 0.5% county surcharge), with a maximum visible pass-on rate of about 4.712%.

HRS § 237-29 is the GET exemption; the certification gate is § 201H-36 (HHFDC) or § 46-15.1 (the counties). A qualified entity receiving gross income for the planning, design, financing, construction, sale or lease of a housing project certified or approved under § 46-15.1 or § 201H-36 may file Form G-37, with a separate form for each project. Section 46-15.1 gives counties the same authorities as HHFDC for developing low to moderate income housing, and provides that county projects get the GET exemption in the same manner as HHFDC projects.

***Note:*** Bill 7 and 201H are modeled at 19% operating expenses because we assume they apply for and are granted the GET exemption and certificate.

## Property Tax

Real property tax is 0.35% a year of assessed value (land plus improvements, the improvements valued at hard cost). NOI is after property tax, which is split between the residential and retail NOI in proportion to their EGI. Over a hold the assessed value grows 2% a year.

- **Bill 7:** improvements are exempt for 15 years (land-only tax) while the affordable rent is 80% AMI or less.
- **TOD:** improvements are exempt for 15 years.
- **Standard, Before Ord. 26-7, 201H:** full tax from year one.

## NOI and Gross Development Value

Net operating income is effective gross income less operating expenses and property tax. Gross development value (GDV) capitalizes it at the market cap rate, with retail at a 150 basis point spread:

```math
\text{GDV} = \frac{\text{residential NOI}}{\text{cap rate}} + \frac{\text{retail NOI}}{\text{cap rate} + 0.015}
```

The cap rate is 5.1% for every zone unless the user changes it.

## Developer Feasibility

### Residual land value (RLV)

The residual land value is the most a developer could pay for the land and still earn its required profit. It is a static residual at stabilization, discounted back to the land purchase:

```math
\text{residual} = \text{GDV} - \text{selling costs} - \text{project cost} - \text{profit}
```

```math
\text{RLV} = \frac{\text{residual}}{(1 + \text{target return})^{\text{months}/12}} + \sum_{m} \frac{\text{grant}_m}{(1 + \text{target return})^{m/12}}
```

- **Selling costs:** 3.5% of GDV.
- **Project cost:** development cost (1.1 × hard + soft) plus financing cost, with the loan sized on construction cost only.
- **Profit:** 15% of project cost.
- **Target return:** 11.5% a year, the carry on the land from purchase to stabilization.
- **Grants (Bill 7 only):** each grant payment is discounted from the month it is paid (grant_m): the pre-construction subsidy evenly over the construction months, the post-construction grant when construction ends. The package reports the parts as rlv_land_carry (the divisor) and rlv_grants_pv (the grants term), so RLV rebuilds from them to within $1.

RLV per sq ft = RLV ÷ lot area, compared against the land cost per sq ft.

### Strategy results

The flip and hold strategies (see Financing) each produce monthly equity cash flows: negative while equity goes in, positive at sale and, for a hold, each month of operation. The levered IRR solves those cash flows; the equity multiple is cash out ÷ equity in.

## Feasibility Metrics

| Metric | Explanation | Poor | Marginal | Strong |
| --- | --- | --- | --- | --- |
| Return on cost | Stabilized NOI ÷ total development cost, net of grants (Bill 7 grants come off the cost at face value) | More than 100 bps below the target | Within 100 bps below the target | At or above the target (cap rate + 1.5%, so 6.6% by default) |
| RLV per square foot | What the project could pay for land and still hit target returns, as a share of the land price | Below 90% | 90–110% | 110% and above |
| Equity multiple | Total dollars returned per dollar of equity, ignoring timing | Below 2.0× | 2.0–2.5× | 2.5× and above |
| Levered IRR | Annualized return on developer equity, sensitive to timing | Below 8% | 8–12% | 12% and above |
| Refinanced equity | Equity gap when the permanent loan cannot fully retire the construction debt | Not scored |  |  |
| **Previously considered** |  |  |  |  |
| Investment spread | Return on cost minus the market cap rate | Not scored |  |  |
| DSCR | Whether the stabilized building can service permanent debt; a lender constraint, not a return | Not scored |  |  |

**Overall verdict:** The four scored metrics vote: the project is poor if at least half are poor, strong if none are poor and at least three quarters are strong, and marginal otherwise. The same verdict colors the Citywide View's map (red, yellow, green), the parcel card and the Project View's viability panel.

***Note:*** return on cost is a ratio, so anything that shrinks the denominator can raise it. Shorter buildings frequently post a higher return on cost than taller ones simply because they cost less, which does not make them better policy outcomes. Levered IRR is the better metric when the question involves timing (permitting delay, construction duration, lease-up).

***Note:*** return on cost takes Bill 7 grants off the development cost at face value, undiscounted. That is the convention: return on cost is one stabilized year of NOI over cost, with no timing, so the grants' timing shows up in the residual land value (discounted) and the levered IRR (monthly cash flows) instead. The Project View's hint reads "Stabilized NOI ÷ Total Development Cost, net of grants".
