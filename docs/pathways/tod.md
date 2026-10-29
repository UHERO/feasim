# Transit-oriented development (TOD)

Program id `tod`, in `src/calculations/calc-tod.ts` (the calculations) and `src/parcels.ts` (the envelope rules, `todEnvelope`). Everything not listed here follows [Housing Policy Simulator logic](../simulator-logic.md).

The TOD pathway models housing on parcels near Honolulu rail stations under two regimes, PD-T (inside the adopted TOD special districts) and IPD-T (elsewhere in the station areas), each at a permit tier from Base to council Approval. Every tier above Base is a ceiling: the community benefits that buy the bonus are not priced.

## Envelope

| Rule | TOD |
| --- | --- |
| FAR | The tier's FAR (see Tiers below); Base uses the underlying zone's FAR |
| Open-space bonus | IPD-T only; none under PD-T (see Lot coverage and open-space bonus) |
| Lot coverage | The underlying zone's (see Lot coverage and open-space bonus) |
| Height | The tier's height (see Tiers and Heights) |
| Ground-floor retail | The underlying zone's rules; under IPD-T, retail follows BMX-3 uses (§ 21-9.100-5(d)(1)) |
| Unit cap | 10 units on IMX-1 under PD-T (see Industrial zones) |

### Regimes

Each parcel is PD-T or IPD-T, never both. PD-T applies inside an adopted TOD special district; IPD-T applies in station areas that do not have one yet (§ 21-9.100-5(b)(6): once a station area joins the special district, its lots lose IPD-T).

| Regime | Law | Station areas | Rule used to assign parcels |
| --- | --- | --- | --- |
| PD-T | § 21-9.100-8, § 21-9.100-10 | Waipahu, Aiea-Pearl City, Halawa (adopted); East Kapolei parcels with a parenthetical height | Every parcel in the three adopted station areas is PD-T. In East Kapolei, a parcel with a parenthetical height on the proposed TOD zoning map is PD-T, because that district is being adopted |
| IPD-T | § 21-9.100-5 | Ala Moana, Downtown, Kalihi, Airport; East Kapolei parcels without a parenthetical | Every other parcel inside a proposed TOD special district boundary |

The regime is stored per parcel (`tod_regime`). In the Project View the user picks it with the Regime toggle.

### Tiers

PD-T has four tiers and IPD-T has two; Base is the default for both. Minor and major special district permits exist only inside a TOD special district, so IPD-T offers only Base and IPD-T Approval.

| Regime | Tier | Max FAR | Max height | What it takes |
| --- | --- | --- | --- | --- |
| PD-T | Base | Underlying zoning, no open-space bonus (§ 21-9.100-8(a)(1)(B)) | Zoned height | Nothing: by right |
| PD-T | Minor Permit | 3.5 in B-2 and BMX-3; 1.2 × base in apartment, AMX, industrial and IMX-1; base in B-1 and BMX-4 | Base + 60 ft or 2 × base, whichever is less, capped at the parenthetical | Minor special district permit; no minimum lot size |
| PD-T | Major Permit | Same as Minor (the § 21-9.100-8 table has no major row) | Base + 120 ft or 3 × base, whichever is less, capped at the parenthetical | Major special district permit; no minimum lot size |
| PD-T | PD-T Approval | 7.0 in B-2 and BMX-3; 2 × base in apartment, AMX, industrial and IMX-1; base in B-1 and BMX-4 | The parenthetical height (§ 21-9.100-10(c)(2)); see Heights where there is none | Council approval of a conceptual plan; 20,000 sq ft minimum |
| IPD-T | Base | Underlying zoning plus the zone's open-space bonus | Zoned height | Nothing: by right |
| IPD-T | IPD-T Approval | 2 × underlying FAR, at most 7.5; in B-2, BMX-3, BMX-4 and IMX-1 the FAR doubles after the open-space bonus (§ 21-9.100-5(e)(1)(C)); a station plan's FAR where higher | The station plan's height (or the zoned height if higher); with no plan figure, 2 × zoned height, at most 450 ft | Council approval of a conceptual plan; 20,000 sq ft minimum; entirely in the State urban district |

Underlying FAR is Table 21-3.3 for the apartment and AMX districts (as amended by Ord. 26-7) and Table 21-3.4 for business (B-1 1.0, B-2 2.5, BMX-3 2.5, BMX-4 4.0). Every tier above Base is a best case: the model assumes the council grants the full bonus and does not price the community benefits, extra fees or longer permitting.

### Eligibility and statuses

Every parcel gets one of four statuses at its regime's tier, checked in this order. Only eligible parcels get the TOD bonus.

| Status | When | What the model builds | Citywide View map | In the summary |
| --- | --- | --- | --- | --- |
| Not modeled | The parcel data has no height limit | Nothing | Gray | Left out |
| Not applicable | Housing is not permitted in the zone at this tier (see Industrial zones) | 0 units | Orange | Left out |
| Ineligible | Outside every TOD boundary; zone not in § 21-9.100-5(b)(5); lot under 20,000 sq ft (except PD-T minor and major permits); or not entirely in the State urban district | The base zoning envelope | Feasibility color | Counted |
| Eligible | Clears every check | The tier's envelope | Feasibility color | Counted |

Eligible districts (§ 21-9.100-5(b)(5)): A-1, A-2, A-3, AMX-1, AMX-2, AMX-3, B-1, B-2, BMX-3, BMX-4, resort, I-1, I-2, I-3 and IMX-1. The 20,000 sq ft minimum is applied per lot: the model does not combine adjacent lots into one project, which the law allows.

The Citywide View's selected-parcel card shows the regime ("PD-T" or "IPD-T") in a white tag, or "PD-T: Not Applicable" in the warning orange when housing is not allowed at the chosen tier. The Project View's status line shows the envelope in gray, and turns orange when the lot is ineligible or not applicable.

### Industrial zones

Housing in an industrial zone needs a TOD permit, and under PD-T only IMX-1 can get one. Table 21-5.1 bars multi-unit dwellings in industrial districts; IPD-T lifts that by allowing BMX-3 uses (§ 21-9.100-5(d)(1)), while PD-T allows up to 10 dwelling units in IMX-1 only (§ 21-9.100-10(g)(2)).

| Zone | PD-T Base | PD-T Minor, Major, Approval | IPD-T Base | IPD-T Approval |
| --- | --- | --- | --- | --- |
| I-1, I-2, I-3 | Not applicable | Not applicable | Not applicable | Eligible (BMX-3 uses) |
| IMX-1 | Not applicable | Eligible, capped at 10 units | Not applicable | Eligible, no unit cap |

The IMX-1 cap is passed to the Housing Policy Simulator as `max_units`, which also shrinks the building to the floor area 10 units need. The law places those units above the ground floor; the model does not force a non-residential ground floor. On very large IMX-1 lots (several exceed 400,000 sq ft) the cap makes PD-T projects infeasible.

Underlying FAR: I-1 1.0, I-2 and I-3 2.5, IMX-1 1.5. All 1,158 industrial parcels in the data are not applicable at Base.

### Heights

PD-T heights come from the TOD zoning map's parenthetical (bonus) height; IPD-T heights come from the station plan where we have its figures, otherwise from doubling. No tier ever drops below the zoned height.

**PD-T parenthetical heights.** 598 parcels carry one (`tod_map_bonus_height`). Minor and major permit heights are capped at it. PD-T Approval reaches it. Where a PD-T parcel has none (82 parcels, mostly in Waipahu), the two tools read the law differently:

| Tool | PD-T Approval height with no parenthetical | Why |
| --- | --- | --- |
| Citywide View (strict) | Zoned height | § 21-9.100-10(c)(2): height may not exceed the parenthetical, and there is none |
| Project View (generous) | The major permit height | The Project View has no zoning map, so it cannot know whether a lot has a parenthetical |

**East Kapolei** parentheticals come from the proposed TOD zoning map, not an adopted one.

**IPD-T station plan ceilings** (§ 21-9.100-5(e)). Core is within a quarter mile of the station, TIZ a quarter to a half mile; the split is a quarter-mile distance proxy, not the plans' own precinct maps.

| Station area | Core FAR | Core height | TIZ FAR | TIZ height | Source |
| --- | --- | --- | --- | --- | --- |
| Ala Moana | 10.0 | 400 ft | 7.0 | 350 ft | Ala Moana Neighborhood TOD Plan Figs. 5-3, 5-4 |
| Downtown | 7.5 | 400 ft | 4.5 | 250 ft | Downtown Neighborhood TOD Plan Figs. 2-6, 2-7 |
| Kalihi | formula | 200 ft | formula | 150 ft | Kalihi Neighborhood TOD Plan Fig. 2-7 |
| Airport, East Kapolei (IPD-T parcels) | formula | 2 × zoned, at most 450 ft | formula | 2 × zoned, at most 450 ft | Plan figures exist only as PDFs and are not transcribed |

A plan FAR replaces the formula only where it is higher. Because Airport and East Kapolei have draft plans, § 21-9.100-5(e)(2)(B) would cap their heights at the plan figures; the model's doubled heights there are upper bounds.

### Lot coverage and open-space bonus

Lot coverage follows the underlying zone, by zone class rather than lot size:

| Zones | Lot coverage |
| --- | --- |
| A-1, AMX-1 | 60% |
| A-2, AMX-2 | 50% |
| A-3, AMX-3 | 40% |
| B-1, B-2, BMX-3, BMX-4 | 100% |
| Industrial and IMX-1 | 60% |

The open-space bonus (how it is sized and the plaza it costs are in [Open-space bonus](../simulator-logic.md#open-space-bonus)) applies differently by regime:

| Regime and tier | Open-space bonus |
| --- | --- |
| PD-T (all tiers) | No: § 21-9.100-8(a)(1)(B) makes it inapplicable in a TOD special district |
| IPD-T Base | Yes, on top of underlying FAR |
| IPD-T Approval | Yes: in B-2, BMX-3 and BMX-4 the FAR doubles after the bonus (2 × 3.5 = 7.0 for B-2 and BMX-3; BMX-4 is capped at 7.5). Where a station plan's FAR is higher, the plan FAR replaces it and no plaza is set aside |

The Project View and the Citywide View apply the bonus the same way. The Max FAR slider's unlocked default includes it.

## Height setbacks

The underlying zone's step-back rule, as in [Standard](bill6.md#height-setbacks).

**Not modeled:** the council can modify or exempt height setbacks for IPD-T and PD-T projects, but the model applies the underlying zone's rule.

## Parking and loading

TOD parking defaults to 0 stalls per unit, the legal minimum: § 21-6.20(a) requires no off-street parking within 0.5 miles of a rail station or in a TOD special district, which covers every TOD parcel. Loading is not exempted: lots over 7,500 sq ft reserve ground for the loading spaces Table 21-6.5 requires (1 for 20 to 150 units, more for larger buildings and retail). The user can still add parking with the Parking slider. Bicycle parking is required (§ 21-6.40) except on industrial-zoned parcels. How stalls are counted, placed and priced is in [Parking and loading](../simulator-logic.md#parking-and-loading).

### Ground floor and parking placement (PD-T)

Inside a TOD special district, parking and loading stay out of the front 40 ft of the lot; the ground-floor use rules that depend on key streets are not modeled, because there is no key-street data. These rules apply to PD-T parcels only, at every tier, since IPD-T lots are outside the special districts.

| Rule | Status | How the model handles it |
| --- | --- | --- |
| § 21-9.100-8(c)(1): no at-grade or ground-floor parking within 40 ft of the front lot line | Modeled | A front strip of the ground floor, the building's width by 40 ft less the front yard (about 2,400 sq ft on a 20,000 sq ft lot), takes no surface stalls, ground-floor stalls or loading. It holds retail, lobby or housing; stalls go behind it or into podium floors |
| § 21-9.100-8(c)(1) exception: a special district permit for small, constrained sites | Not modeled | The 40 ft rule always applies |
| § 21-9.100-8(c)(2): service areas and loading at the side or rear | Modeled | Loading stays out of the front strip |
| § 21-9.100-8(c)(3): vehicle access from a secondary street | Not modeled | The model does not place driveways |
| § 21-9.100-8(c)(4): ground floor of parking structures active within 40 ft of the front | Modeled | Same front strip |
| § 21-9.100-7(a): BMX ground floor in active use on 80% of frontage facing a key street, public open space or transit station | Not modeled | No key-street data; ground-floor retail stays optional |
| § 21-9.100-7(b): AMX ground floor facing those frontages in dwellings or active use | Not modeled; met on the front | Not checked, since there is no key-street data, but met on every lot's front as a side effect: the 40 ft rule keeps parking out of it, and what remains (housing, retail or a residential lobby) all qualify under § 21-9.100(c), which lists lobbies for multi-unit dwellings as active use. Not covered: the side facade of a corner lot facing a key street, which could still get ground-floor stalls |
| § 21-9.100-7(c): up to 10 dwelling units in IMX-1, above the ground floor | Partly modeled | The 10-unit cap applies; units are not forced above the ground floor |

At the default of no parking the strip changes nothing. With parking added the effect is small: at 1 stall per unit and PD-T Approval, PD-T units fall 0.8% (692,706 to 687,413), and the strip never adds units.

## Affordability

Table 29-1.4 (see [Standard](bill6.md#affordability)) requires IPD-T, PD-T and TOD special district projects seeking bonus height or density to provide 30%, 20% or 10% of for-sale units on site, or 15% for rental. § 29-1.4(a) says the requirement must be met by satisfying one or a combination of the options, and for-rental affordable units must be rented to households earning 80 percent and below of the AMI.

***Note:*** since 8/25/26 sale units are no longer implemented, and under § 29-1.3 the Chapter 29 requirement is triggered by for-sale development, so the code models 0 affordable units in the TOD pathway (`afd_rent_units = 0` in `calc-tod.ts`). The earlier 15% rental assumption is no longer in the code.

## Fees, waivers and taxes

**Wastewater system facility charges:** waived for affordable dwelling units provided pursuant to a planned development-transit permit (§ 21-9.100-10) or an interim planned development-transit permit (§ 21-9.100-5).

**TOD permit fees:** a $15,000 zoning application fee and the special district permit fee ($1,200 plus $300 per acre, at most $15,400), added to soft costs.

**Building permit, plan review and BWS water charges:** charged on market units under the default Impact Fees toggle (Market Units Only).

**Property tax:** improvements are exempt from real property tax for 15 years (land-only tax).

## Default assumptions

| Input | Default |
| --- | --- |
| Unit mix | All one-bedroom |
| Affordable share | 0% |
| Affordable / market rent | 80% / 120% AMI |
| Hard cost | $450 per sq ft |
| Operating expense ratio | 30% of EGI |
| Parking | 0 stalls |
| Park dedication | In-lieu fee |
| Impact Fees toggle | Market Units Only |
| Permanent rate / minimum DSCR | 6.75% / 1.20 |
| Hold period | 8 years |
| Timeline | 18 months of permitting, 12 of construction and 9 of lease-up |
| Tier | Base, for both regimes |

## Project View and Citywide View

Both views build the envelope with the same function (`todEnvelope`, in this package `src/parcels.ts`) and run the same calculations; given the same envelope they agree exactly (5,440 test cases, 0 differences). They differ only in what they know about the lot.

| Control | Project View | Citywide View |
| --- | --- | --- |
| Regime | TOD Regime toggle: IPD-T or PD-T | From the parcel data |
| Tier | Development Standard toggle: Base and IPD-T Approval under IPD-T; Base, Minor Permit, Major Permit and PD-T Approval under PD-T | Two dropdowns, PD-T Standard and IPD-T Standard; each parcel takes its own regime's setting, so PD-T and IPD-T parcels can run different tiers at once |
| Station area and precinct | Toggles, shown under IPD-T only; stations are None, Ala Moana, Downtown, Kalihi, Airport, East Kapolei | From the parcel data |
| Zone | All 17 eligible zones; a zone without housing at the tier shows "Not applicable" | From the parcel data |
| Zoned height | Max Height (ft) slider | From the parcel data |
| Lot size | Slider, default 20,000 sq ft | From the parcel data |
| Max FAR, Max Height override | Unlocked default is the envelope | Unlocked default is the selected parcel's envelope |

**Where results can differ for the same lot:**

1. PD-T Approval with no parenthetical: the Project View uses the major permit height, the Citywide View the zoned height (see Heights).
2. Minor and major permit heights: the Citywide View caps them at the parcel's parenthetical; the Project View has no parenthetical input, so it never caps.
3. The Project View assumes the lot is entirely in the State urban district; the Citywide View reads it from the data (36 parcels are not).

## Parcel data

The Citywide View's TOD parcel set holds 2,810 parcels, 668 PD-T and 2,142 IPD-T; 1,158 are industrial and 1,046 meet the 20,000 sq ft minimum.

| Station area | Regime | Parcels | Industrial | With parenthetical | 20,000 sq ft or more |
| --- | --- | --- | --- | --- | --- |
| Kalihi | IPD-T | 829 | 645 | 0 | 173 |
| Downtown | IPD-T | 525 | 107 | 0 | 164 |
| Ala Moana | IPD-T | 484 | 0 | 0 | 107 |
| Waipahu | PD-T | 422 | 94 | 373 | 162 |
| Airport | IPD-T | 296 | 295 | 0 | 248 |
| Aiea-Pearl City | PD-T | 165 | 8 | 142 | 110 |
| East Kapolei | PD-T | 60 | 2 | 60 | 59 |
| Halawa | PD-T | 21 | 0 | 13 | 17 |
| East Kapolei | IPD-T | 8 | 7 | 0 | 6 |

**Fields:** `tmk`, `address`, `zone_class`, `lot_sqft`, `height` (zoned), `lat`, `lng`, `region`, `tod_regime`, `station_area`, `tod_precinct` (core or TIZ), `slu_urban`, and `tod_map_bonus_height` where the TOD zoning map shows a parenthetical.

**Sources.** Apartment and business parcels come from the Citywide View's zoning extracts, with lot size from HHDB. The 1,158 industrial parcels (862 IMX-1, 287 I-2, 9 I-3) were added from the county zoning layers: parcels overlapping a TOD boundary by at least 25%, heights from the Zoning Map Height Limit layer, and lot size from GIS polygon area rather than HHDB. Lot outlines are in `parcel-shapes.json`.

**Edits made by hand:**

- 49 parcels in Waipahu, Aiea-Pearl City and Halawa tagged IPD-T were changed to PD-T: everything in an adopted district is PD-T.
- 69 East Kapolei parcels with a parenthetical height were changed to PD-T (60 remain after the road removals below); those without one stay IPD-T.
- Road parcels were removed in two rounds, 8 and then 31, from every pathway's data and the lot outlines. 25 of them were in the TOD set: 91017167, 91017188, 91018033, 91018034, 91018041, 91018050, 91018051, 96003039, 94014006, 97023021, 12013016, 15021022, 15021001, 15020012, 15020011, 15039010, 15021046, 91017182, 91017183, 91017191, 91017192, 91018052, 23034036, 23032048 and 23038011.

## Where the model differs from the law

The model follows §§ 21-9.100-5, -8 and -10 for FAR, height, eligibility and uses; the differences below are simplifications or readings of open text, and most make results optimistic.

| Topic | The law | The model | Effect |
| --- | --- | --- | --- |
| Community benefits | Bonuses must be commensurate with benefits (§ 21-9.100-8(a)(1)(E), -5(g)) | Every tier above Base is granted in full and benefits are not priced | Optimistic above Base |
| IPD-T height at Airport and East Kapolei | Capped at the draft plan's height (§ 21-9.100-5(e)(2)(B)) | 2 × zoned height up to 450 ft; plan figures are only in PDFs | Heights are upper bounds |
| East Kapolei regime | Still IPD-T until its special district is adopted | Parcels with a parenthetical are PD-T | Anticipates adoption |
| Combining lots | Several lots, even across a street, can form one 20,000 sq ft project (§ 21-9.100-5(b)(3), -10(a)(1)) | Each lot stands alone | Small lots understated |
| IMX-1 under PD-T | Up to 10 units above the ground floor | 10-unit cap; ground floor not forced non-residential | Slightly optimistic |
| BMX-4 under IPD-T Approval | Doubling after the bonus would give 15.0; (A) caps FAR at 7.5 | Capped at 7.5 | A reading of open text |
| PD-T Approval without a parenthetical | Height may not exceed the parenthetical (§ 21-9.100-10(c)(2)) | Citywide View keeps the zoned height; Project View uses the major permit height | Project View optimistic |
| Station precincts | Plans map core and TIZ precincts | Quarter-mile distance proxy | Approximate plan ceilings |
| IPD-T flexibility | Yards, building area, open space and landscaping set by the conceptual plan; arcade bonus; public housing at 7.5 FAR and 400 ft | Underlying standards; not modeled | Conservative |
| Affordable housing (Ch. 29) | Applies to for-sale projects of 10 or more units | Not applied: the model is rental only | None |
| Lot size | HHDB land area | GIS polygon area for the 1,170 industrial parcels | Small, near the 20,000 sq ft cutoff |

## Sources

- [§ 21-9.100-8, TOD general requirements and development standards (amlegal)](https://codelibrary.amlegal.com/codes/honolulu/latest/honolulu/0-0-0-22465)
- § 21-9.100-5 (IPD-T) and § 21-9.100-10 (PD-T), ROH Chapter 21, as amended through Ord. 25-2
- [Bill 2 (2020), CD1, FD2: off-street parking and loading, § 21-6.20(a)](https://hnldoc.ehawaii.gov/hnldoc/document-download?id=8998)
- [Ordinance 26-7 (Bill 6, 2026): apartment and AMX development standards](https://hnldoc.ehawaii.gov/hnldoc/document-download?id=27706)
- [Bill 49 (2022): TOD special district amendments](https://hnldoc.ehawaii.gov/hnldoc/document-download?id=14866)
- Ala Moana Neighborhood TOD Plan, Figs. 5-3 and 5-4; Downtown Neighborhood TOD Plan, Figs. 2-6 and 2-7; Kalihi Neighborhood TOD Plan, Fig. 2-7
- City and County of Honolulu zoning, Zoning Map Height Limit and TOD Zoning (adopted and proposed) GIS layers; HHDB parcel land area
