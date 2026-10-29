# Miscellaneous: retired assumptions, open questions and future work

This page keeps the record of assumptions the model no longer makes, the open questions behind some of its choices, and work planned for later versions. The current behavior is documented in [Housing Policy Simulator logic](simulator-logic.md) and the [pathway pages](README.md#pathways); this page only explains how it got there.

## Retired assumptions

Earlier versions of the model made these assumptions. Each row gives what the model does now and where that is documented.

| Earlier assumption | Modeled now | Documented in |
| --- | --- | --- |
| TOD (IPD-T / PD-T) projects pay no zoning permit fee. | TOD pays a $15,000 zoning application fee and the special district permit fee ($1,200 plus $300 per acre, at most $15,400), at every tier including Base. | [TOD: Fees, waivers and taxes](pathways/tod.md#fees-waivers-and-taxes) |
| Every project in a special district applies for the major permit; minor permits are not considered. | Special district permit fees are charged only in TOD, as one fee whether the project would need a minor or a major permit. Outside TOD they are not modeled. | [TOD: Fees, waivers and taxes](pathways/tod.md#fees-waivers-and-taxes), [Special districts](pathways/special-districts.md) |
| Grading and stockpiling permits are sized on the buildable area. | Grubbing is sized on the whole lot area; grading and stockpiling on the excavated volume, lot area × the zone's excavation depth. | [Soft cost assumptions](simulator-logic.md#soft-cost-assumptions) |
| The Rental Housing Revolving Fund is a funding source alongside the Bill 7 grants. | The only public funding modeled is the Bill 7 grants. The Rental Housing Revolving Fund is listed under [future work](#future-work). | [Model-wide Assumptions](simulator-logic.md#model-wide-assumptions) |
| Parking stalls are counted from the buildable area, because there are no blueprints showing how much floor area parking takes. | Stalls are counted from the unit mix and the retail area, and are physically placed on the lot (a surface lot if the stalls fit beside the building, otherwise the ground floor, then podium floors), so parking takes up envelope space as well as cost. | [Parking and Loading](simulator-logic.md#parking-and-loading) |
| Every pathway uses the same parking ratio, 1 stall per 1,000 sq ft (ROH Chapter 12, Table 12-6.1), and parking is a cost only, with no physical footprint. | Requirements follow LUO Table 21-6.1 and differ by pathway: Bill 7 and TOD require no car parking, and parcels exempt under § 21-6.20(a) (Primary Urban Center, Ewa, or within 0.5 miles of a rail station) need no stalls in the Citywide View. TOD still provides bicycle parking. | [Parking and Loading](simulator-logic.md#parking-and-loading), each pathway's Parking and loading section |
| A TOD developer builds one project at a time, so the "off-site, same area" affordable housing case is not modeled. | Still true, and it now holds model-wide: each lot is one project by one developer. The off-site affordability cases themselves no longer apply, because Chapter 29 is not applied. | [Model-wide Assumptions](simulator-logic.md#model-wide-assumptions) |
| On-site, off-site same area and off-site different area affordability (ROH Chapter 29) are treated the same, using the highest unit share and affordability period in each category, without the marketing-period differences. | Chapter 29 is not applied. The model builds rental housing only, and each pathway sets its own affordable share. | Each pathway's Affordability section |
| Bill 7 and Chapter 29 parcels are mutually exclusive when the Citywide View's parcel table is built. | No longer relevant, because Chapter 29 is not applied. Each run is a single pathway. | [Model-wide Assumptions](simulator-logic.md#model-wide-assumptions) |
| Lot width and depth are both the square root of the lot area (a square lot). | The lot is twice as deep as it is wide. | [Buildable area](simulator-logic.md#buildable-area) |
| Utility connection is a flat $50 per unit. | $245 per unit: the $195 trench permit for the first 20 lineal ft plus the $50 service connection (ROH Chapter 14). | [Soft cost assumptions](simulator-logic.md#soft-cost-assumptions) |
| The only impact fees are the "Impact Fees by Land Use" (ROH Chapter 33A), with A and AMX parcels charged as residential multi-family. | City impact fees by land use are not modeled. The school impact fee (HRS Chapter 302A) is set to $0 per unit for now, and the Impact Fee input can set a value. | [School impact fees](simulator-logic.md#school-impact-fees) |
| Construction cost is the RLB Q4 2025 average for Oʻahu, by zone. | A single hard cost rate, $450 per sq ft by default, set with the construction cost lever. The by-zone table is still in the code but unused. | [Construction costs](simulator-logic.md#construction-costs), [Variables](variables.md) |
| Every Bill 7 unit is affordable; the up to 20% of units allowed for owners and their relatives is ignored. | 80% of Bill 7 units are affordable and 20% are rented at market. | [Bill 7: Affordability](pathways/bill7.md#affordability) |
| Only parcels in A and AMX zones are included. | Apartment (A), apartment mixed use (AMX), business (B), business mixed use (BMX), Waikiki special district and, in TOD, industrial zones are included. | [Pathways](README.md#pathways), [TOD: Industrial zones](pathways/tod.md#industrial-zones) |
| All parcels in IPD-T zones go through the PD-T permit pathway. | PD-T and IPD-T are separate regimes with their own rules. | [TOD: Regimes](pathways/tod.md#regimes) |
| When the user picks 30% AMI for sale units, sale prices use HHFDC's 50% AMI sale price, the lowest level HHFDC publishes for sale units. | The model builds rental housing only, so AMI sale prices are not used. Rents for AMI levels HHFDC does not publish are scaled from the 50% AMI row. | [AMI unit rent](simulator-logic.md#ami-unit-rent) |
| Operating expenses grow 2.7% a year during the hold, following general CPI. | 3.5% a year, the expense escalation rate California's TCAC requires in LIHTC cash flows (4 CCR § 10327(g)(1)). | [Cash flow by developer strategy](simulator-logic.md#cash-flow-by-developer-strategy) |
| Market rents grow 3.2% a year (Honolulu CPI), and hold-period rents grow at a blended 3.5% (affordable 4%, market 3.2%). | All rents, affordable and market, grow 4% a year, the compound growth of HHFDC's Honolulu County median income. | [Rent growth](simulator-logic.md#rent-growth) |
| The Bill 7 pre-construction grant pays a 15% prevailing wage premium on the whole hard cost, based on developer interviews and outside studies. | A 45% premium on the labor portion only. Labor is 25% of hard cost, so the premium is 11.25% of hard cost. The 45% is the average gap between Oʻahu prevailing wage rates and Honolulu market wages. | [Bill 7: Prevailing wage premium](pathways/bill7.md#prevailing-wage-premium) |
| Park dedication has two routes: build a park (the $300 application fee plus the cost of building a public or private park), or pay the $200 in-lieu fee plus the fair market value of the land. | Two options: **in lieu** (the application fee plus the fair market value of the park land) and **exempt** (no park dedication cost). The park construction route was removed; its unused cost code is still in the code. | [Park dedication](simulator-logic.md#park-dedication) |

## Considerations

Open questions raised while building the model, and where each one stands.

| Consideration | Status |
| --- | --- |
| The HHFDC rental guidelines in use were from 2023 and may not reflect typical rents. Should they be checked against comparable affordable projects, or moved to the 2025 schedule? | **Partly resolved.** The model now uses HHFDC's 2025 Honolulu County schedule. It has not been checked against comparable projects. See [AMI unit rent](simulator-logic.md#ami-unit-rent). |
| Standard affordable housing (ROH § 29-1.6) sets different AMI requirements for different marketing periods. The model took the highest affordability percentage for the whole 30-year period. Should later versions model the marketing periods? | **No longer applies.** Chapter 29 is not applied, because the model builds rental housing only. It would come back only if for-sale housing is added. |
| Some annual data sources have newer releases than the model uses. For example, HHFDC's [2026 income and rent guidelines](https://dbedt.hawaii.gov/hhfdc/2026/06/23/honolulu-county-income-rent-sales-price-guidelines-2026/) are out, but the model uses 2025. Should the older data be updated, with an update schedule? | **Open.** The 2025 data year is noted in [AMI unit rent](simulator-logic.md#ami-unit-rent). The Review column in [Variables](variables.md) gives how often each input should be checked. |
| The BWS water system facilities charge waiver applies only to the fixture units of the certified affordable units, while the meter waiver is the certified share of all units. How should the two charges and their waivers be modeled? | **Resolved.** Both are modeled this way, with fixture units from BWS's fixture unit worksheet. See [BWS Water Charges](simulator-logic.md#bws-water-charges-water-system-facilities-charge-and-new-meter-cost). |
| The open-space bonus (3.5 / 3.5 / 7.5 under § 21-3.120-2(c)) is not modeled in the Waikiki Apartment Precinct. One simple option is to treat the open-space part of the lot as not buildable. | **Open.** Listed as not modeled in [Special districts](pathways/special-districts.md). |

## Loopholes

| Loophole | Status |
| --- | --- |
| A project that meets the requirements of both Bill 7 and 201H can stack their grants and subsidies (ROH Chapter 32, Articles 4 and 5). | **Not modeled.** Each run is a single pathway. See [Model-wide Assumptions](simulator-logic.md#model-wide-assumptions), [Bill 7](pathways/bill7.md) and [201H](pathways/h201.md). |

## Future work

Planned or proposed additions, with what is already done.

| Item | Status |
| --- | --- |
| Land acquisition cost. | **Done.** Land cost is a lever, $130 per sq ft of lot by default, and is part of total development cost. |
| Park dedication fees. | **Done.** See [Park dedication](simulator-logic.md#park-dedication). |
| Impact fees. | **Partly done.** The school impact fee is in the soft costs, set to $0 per unit for now and adjustable with the Impact Fee input. City impact fees by land use are not modeled. |
| Make the construction loan rate a user input instead of a fixed rate. | **Done.** It is a lever, 8% by default. See [Construction loan](simulator-logic.md#construction-loan). |
| Pay the Bill 7 post-construction grant as a reimbursement. | **Done.** The grant is paid when construction ends, not up front. See [Bill 7: Grants](pathways/bill7.md#grants). |
| Real property tax. Revenue was valued from a single stabilized year (direct capitalization), so property tax was left out. | **Done.** Property tax is in net operating income and grows with the assessed value during the hold. Bill 7 is exempt for its first 15 years. |
| Rental Housing Revolving Fund project awards (201H funding; $300 million state fund cap). | **Open.** How awards are distributed is not published, so it is not modeled. |
| Other grants and subsidies that reduce total project cost before financing, for pathways other than Bill 7. | **Open.** |
| Construction cost per sq ft by quality level, based on how high-end the user wants the building. | **Open.** There is one hard cost rate lever. |
| A land option payment during carry (for example 10% of land value a year, paid monthly). | **Open.** |
| Itemized operating expenses (utilities, taxes, fees, payroll). | **Open.** Operating expenses are a single share of effective gross income. |
