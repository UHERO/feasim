# Special districts

Special districts are not a separate pathway in the code. The Waikiki Special District's two residential precincts are modeled as zone classes that run under the Standard, Before Ord. 26-7, Bill 7 and 201H pathways, each with the district's own standards. The TOD special districts are handled by the [TOD](tod.md) pathway instead. Everything not listed here follows the pathway the parcel runs under and [Housing Policy Simulator logic](../simulator-logic.md).

| Zone code | District | Parcels in the Citywide View |
| --- | --- | --- |
| `Apart` | Waikiki Apartment Precinct | 90 |
| `ApartMix` | Waikiki Apartment Mixed Use Subprecinct | 29 |

## Envelope

| Rule | Waikiki precincts |
| --- | --- |
| FAR | Standard (post Ord. 26-7) and 201H: 4.0. Before Ord. 26-7: 0.00003 × lot + 1.3 under 20,000 sq ft, else 1.9. Bill 7: 4.0 |
| Open space | 35% of the lot must stay open (50% when FAR is 1.5 or more); the stricter of that and the coverage cap governs (Waikiki Special District standards) |
| Lot coverage | 100%, less the required open space (Bill 7: 80%) |
| Ground-floor retail | Apartment Mixed Use Subprecinct only, up to 60% of the lot |

The open-space set-aside is keyed on the FAR the envelope actually uses, including a Max FAR override, so a FAR set to 1.5 or more triggers the larger 50% set-aside.

## Height setbacks

Above 40 ft, the front, side and rear yards grow by 1 ft per 10 ft of height (§ 21-9.80-5(c)(2)). Unlike the other zones' rules (see [Standard](bill6.md#height-setbacks)), the front yard steps back too. Bill 7 projects take no step-backs.

**Not modeled:** Waikiki coastal height setbacks (no structures within 100 ft of the certified shoreline, then a 1:1 plane): the parcel data has no shoreline distance.

## Parking and loading

The parking rules of the pathway the parcel runs under: the Article 6 minimum and the § 21-6.20(a) exemption in Standard, Before Ord. 26-7 and 201H (see [Standard](bill6.md#parking-and-loading)), and none in [Bill 7](bill7.md#parking-and-loading).

## Affordability

Table 29-1.4 (see [Standard](bill6.md#affordability)) requires 15%, 10% or 5% of for-sale units on site (with the matching off-site and land options), or 5% for rental, outside the TOD districts. § 29-1.4(a) says the requirement must be met by satisfying one or a combination of the options, and if a combination is used the declarant designates the proportionate share each option fulfills, with the shares summing to at least one. Moreover, for-rental affordable dwelling units must be rented to households earning 80 percent and below of the AMI.

***Note:*** since 8/25/26 sale units are no longer implemented. Under § 29-1.3 (Applicability) these requirements are only triggered if for-sale units are developed, so a special district project carries the affordable share of the pathway it runs under: none in Standard and Before Ord. 26-7, 80% in Bill 7, and at least 50% + 1 in 201H.

## What is not modeled

- Other special districts (Hawaii Capital, Diamond Head, Punchbowl, Chinatown, Thomas Square and others): their parcels run under their underlying zoning.
- Special district permit fees outside TOD.
- An open-space bonus in the Waikiki precincts: the § 21-3.120-2(c) bonus applies only to B-2, BMX-3 and BMX-4 in the model.
