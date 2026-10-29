# Before Ord. 26-7

This pathway is baseline development under the apartment district standards as they stood before Ordinance 26-7 (Bill 6, 2026), kept for comparison. It runs in `src/calculations/calc-standard.ts`, program id `standard` (the id predates the rename; the current Standard pathway is [`bill6`](bill6.md)). It differs from Standard mainly in FAR and lot coverage, which scale with lot size. Everything not listed here follows [Housing Policy Simulator logic](../simulator-logic.md).

## Envelope

| Rule | Before Ord. 26-7 |
| --- | --- |
| FAR | Apartment and AMX FAR rises with lot area up to a cap (the pre-Ord. 26-7 Table 21-3.3 formulas, below). Business districts use Table 21-3.4: B-1 1.0, B-2 2.5, BMX-3 2.5, BMX-4 4.0 |
| Open-space bonus | B-2 and BMX-3 up to 3.5, BMX-4 up to 7.5, as in Standard (see [Open-space bonus](../simulator-logic.md#open-space-bonus)) |
| Lot coverage | Apartment and AMX districts: 60% of lots under 7,500 sq ft, 50% of lots up to 20,000 sq ft, and 40% above. Business districts 100%. The Waikiki precincts keep 35–50% of the lot open (see [Special districts](special-districts.md)) |
| Height | The zoned height in the Citywide View; the Max Height slider in the Project View (default 30 ft) |
| Ground-floor retail | Allowed in AMX-1, AMX-2, AMX-3, BMX-3, BMX-4 and the Waikiki Apartment Mixed Use Subprecinct |
| Unit cap | None |

**FAR formulas.** Lot area is in sq ft:

| Zones | Under 10,000 sq ft | 10,000 to 40,000 sq ft | Over 40,000 sq ft |
| --- | --- | --- | --- |
| A-1, AMX-1 | 0.00003 × lot + 0.3 | 0.00001 × lot + 0.5 | 0.9 |
| A-2, AMX-2 | 0.00009 × lot + 0.4 | 0.00002 × lot + 1.1 | 1.9 |
| A-3, AMX-3 | 0.00014 × lot + 0.6 | 0.00004 × lot + 1.6 up to 20,000 sq ft; 0.00002 × lot + 2.0 above | 2.8 |
| Waikiki Apartment Precinct and Mixed Use | 0.00003 × lot + 1.3 | 0.00003 × lot + 1.3 up to 20,000 sq ft; 1.9 above | 1.9 |

Example: a 10,000 sq ft A-2 lot gets FAR 0.00002 × 10,000 + 1.1 = 1.3, against 3.0 under the current Standard pathway.

## Height setbacks

The same zone step-back rules as [Standard](bill6.md#height-setbacks); Ord. 26-7 did not change them.

## Parking and loading

The same Article 6 requirements as [Standard](bill6.md#parking-and-loading): 1 stall per 1,000 sq ft of dwelling area plus 1 per 500 sq ft of retail, 90% when combined, loading on lots over 7,500 sq ft, and bicycle parking. The § 21-6.20(a) exemption applies parcel by parcel: 6,998 of 9,444 parcels are exempt.

**Impact of the exemption.** Citywide View totals at default levers, retail off, with the Article 6 minimum on every parcel and then with the exemption applied: stalls fall from 445,399 to 78,049, units rise from 886,336 to 1,022,077, and parcels rated strong rise from 93 to 1,987.

## Affordability

The model builds no affordable units in this pathway. The Table 29-1.4 requirements are the same as under [Standard](bill6.md#affordability).

***Note:*** since 8/25/26 sale units are no longer implemented. Under § 29-1.3 (Applicability) the Chapter 29 requirement is triggered by for-sale development, so the code models 0 affordable units in this pathway (`afd_rent_units = 0` in `calc-standard.ts`). The earlier assumption of 5% affordable rental units is commented out in the code.

## Fees, waivers and taxes

**Wastewater system facility charges:** waived for affordable rental housing units rented to households earning 100 percent and below of the AMI.

**Park dedication:** park land is charged only on units not exempt under § 22-7.3(j); in other words only market units are charged toward the park dedication requirement.

**BWS water charges:** charged on market units under the default Impact Fees toggle (Market Units Only).

**Property tax:** full tax from year one.

***Note:*** these waivers reach only units rented as affordable. Since the pathway models no affordable units by default, every unit pays these fees.

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
