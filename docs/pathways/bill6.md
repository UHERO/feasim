# Standard (post Ord. 26-7)

The Standard pathway is baseline development under the apartment and business district standards as amended by Ordinance 26-7 (Bill 6, 2026). It runs in `src/calculations/calc-bill6.ts`, program id `bill6` (the id predates the rename). Everything not listed here follows [Housing Policy Simulator logic](../simulator-logic.md).

## Envelope

| Rule | Standard |
| --- | --- |
| FAR | Table 21-3.3 as amended by Ord. 26-7: A-1/AMX-1 2.0; A-2/AMX-2 3.0; A-3/AMX-3 and the Waikiki precincts 4.0. Business districts keep Table 21-3.4: B-1 1.0, B-2 2.5, BMX-3 2.5, BMX-4 4.0 |
| Open-space bonus | B-2 and BMX-3 up to 3.5, BMX-4 up to 7.5, with 1 sq ft of plaza per 5 sq ft of bonus floor area (see [Open-space bonus](../simulator-logic.md#open-space-bonus)) |
| Lot coverage | 60% in the apartment and AMX districts (Ord. 26-7 replaced the lot-size tiers with a flat 60%); 100% in business districts; the Waikiki precincts keep 35–50% of the lot open (see [Special districts](special-districts.md)) |
| Height | The parcel's zoned height in the Citywide View (30 ft when the record has none); the Max Height slider in the Project View (default 30 ft) |
| Ground-floor retail | Allowed in AMX-1, AMX-2, AMX-3, BMX-3, BMX-4 and the Waikiki Apartment Mixed Use Subprecinct |
| Unit cap | None |

## Height setbacks

Standard applies each zone's step-back rule. Before Ord. 26-7, 201H and TOD apply the same rules through their underlying zone. Ord. 26-7 left these rules unchanged.

| Zone | Rule | Yards affected | Source |
| --- | --- | --- | --- |
| A-2, A-3 | Above 40 ft: +1 ft per 10 ft of height or portion | Side and rear | ROH § 21-3.80-1(c)(2) |
| AMX-2, AMX-3 | Above 40 ft: +1 ft per 10 ft | Side and rear | ROH § 21-3.90-1(c) |
| B-2, BMX-3, IMX-1 | Above 40 ft: +1 ft per 10 ft | Side and rear | Ord. 17-55 |
| BMX-4 | Modeled with the BMX-3 rule | Side and rear | The LUO uses a 65° street-angle plane instead (§ 21-3.120-2(c)) |
| Resort | Above 30 ft: +1 ft per 10 ft | Side and rear | ROH § 21-3.100-1(c)(3) |
| Waikiki Apartment Precinct and Apartment Mixed Use Subprecinct | Above 40 ft: +1 ft per 10 ft | Front, side and rear | ROH § 21-9.80-5(c)(2) |
| A-1, AMX-1 | None | — | LUO Table 21-3.3 |

How a step-back is applied storey by storey, with a worked example, is in [Height setbacks](../simulator-logic.md#height-setbacks).

**Not modeled:** BMX-4's actual 65° street-angle plane (the BMX-3 rule stands in for it).

## Parking and loading

| Requirement | Standard |
| --- | --- |
| Housing stalls | 1 per 1,000 sq ft of dwelling area (0.5 per one-bedroom), Table 21-6.1 |
| Retail stalls | 1 per 500 sq ft |
| Joint use | 90% when housing and retail both need stalls (Table 21-6.2) |
| Loading | Lots over 7,500 sq ft (Table 21-6.5) |
| Bicycle parking | Required (§ 21-6.40) |
| § 21-6.20(a) exemption | Applied parcel by parcel: exempt parcels (Primary Urban Center, Ewa, near rail) need no car stalls but still need loading and bicycle parking. 6,998 of 9,444 Standard parcels are exempt |

**Impact of the exemption.** Citywide View totals at default levers, retail off, with the Article 6 minimum on every parcel and then with the exemption applied: stalls fall from 623,728 to 120,384, units rise from 1,243,569 to 1,444,875, and parcels rated strong rise from 176 to 5,159.

How stalls are counted, placed and priced is in [Parking and loading](../simulator-logic.md#parking-and-loading).

## Affordability

The model builds no affordable units in this pathway: it is rental only, and the Chapter 29 requirement is triggered by for-sale development.

**Table 29-1.4: affordable housing requirement, as a percentage of the total number of dwelling units in the principal project** (requirements in effect from April 3, 2018):

| Principal project location | For sale or rental | On-site production | Off-site production | Conveyance of land |
| --- | --- | --- | --- | --- |
| IPD-T projects, PD-T projects, or TOD special district projects seeking bonus height or density, or both | For sale | 30% / 20% / 10% | 30–35% / 20–25% / 10–15% | Conveyance of land |
| Same | For rental | 15% |  |  |
| All other areas | For sale | 15% / 10% / 5% | 15–20% / 10–15% / 5–10% | Conveyance of land |
| Same | For rental | 5% |  |  |

§ 29-1.4(a) says the requirement must be met by satisfying one or a combination of the options, and if a combination is used the declarant designates the proportionate share each option fulfills, with the shares summing to at least one. Moreover, for-rental affordable dwelling units must be rented to households earning 80 percent and below of the AMI.

***Note:*** since 8/25/26 sale units are no longer implemented. Under § 29-1.3 (Applicability) the Chapter 29 requirement is triggered by for-sale development, so the code models 0 affordable units in the Standard pathway (`afd_rent_units = 0` in `calc-bill6.ts`). The earlier assumption of 5% affordable rental units is commented out in the code.

## Fees, waivers and taxes

**Wastewater system facility charges:** Affordable dwelling units are exempt from wastewater facility charges entirely. In the model this is applied by charging the wastewater fee only on the non-affordable (market) unit count.

**Building permit and plan review fees:** waived in proportion to the affordable share (Ord. 19-8 § 4, adding ROH 18-6.5(i)). The building official waives these fees for "the portion of an affordable rental housing project equal to the percentage of affordable rental housing units."

**Park dedication:** affordable units exempt (Ord. 19-8 § 5, amending ROH 22-7.3(j)). The subdivision article's park-dedication requirement does not apply to affordable rental dwelling units. In the model, the park requirement is sized on chargeable (market) units only, so affordable units contribute no park-dedication cost or in-lieu fee.

**BWS water charges:** charged on market units under the default Impact Fees toggle (Market Units Only).

**Property tax:** full tax from year one.

***Note:*** the ordinance cited above is Bill 7's (Ord. 19-8); its waivers are keyed to affordable rental units, so they reach a Standard project only for the units it rents as affordable. Since the Standard pathway models no affordable units by default, every unit pays these fees.

## Default assumptions

| Input | Default |
| --- | --- |
| Unit mix | All one-bedroom |
| Affordable share | 0% |
| Affordable / market rent | 80% / 120% AMI |
| Hard cost | $450 per sq ft |
| Operating expense ratio | 30% of EGI |
| Parking | The Article 6 minimum (0 on exempt parcels) |
| Park dedication | In-lieu fee |
| Impact Fees toggle | Market Units Only |
| Permanent rate / minimum DSCR | 6.75% / 1.20 |
| Hold period | 8 years |
| Timeline | 18 months of permitting, 12 of construction and 9 of lease-up |
