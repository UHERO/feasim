# @uhero/feasim documentation

How the model works and where its numbers come from. The [README](../README.md) covers installing the package, the API and examples; these pages are the methodology reference behind it.

## Start here

[Housing Policy Simulator logic](simulator-logic.md): the pipeline every pathway runs, from the building envelope through costs, financing, revenue and residual land value to the verdict.

## Pathways

Each pathway page describes only what differs from the shared [Housing Policy Simulator logic](simulator-logic.md). The code name is the pathway's `program` id. The ids are historical: `bill6` is current zoning and `standard` is the rules before Ordinance 26-7.

| Page | `program` | Summary |
| --- | --- | --- |
| [Standard (post Ord. 26-7)](pathways/bill6.md) | `bill6` | Baseline development under the apartment standards as amended by Ord. 26-7 |
| [Before Ord. 26-7](pathways/standard.md) | `standard` | Baseline development under the apartment standards before Ord. 26-7 |
| [Bill 7](pathways/bill7.md) | `bill7` | ROH Chapter 32: affordable rental housing, FAR 4.0 and 60 ft cap, no parking, most fees waived, and a 15-year real property tax exemption |
| [TOD (IPD-T / PD-T)](pathways/tod.md) | `tod` | Transit-oriented development near rail stations: permit tiers that raise FAR and height, no car parking, and higher affordability requirements |
| [201H](pathways/h201.md) | `h201` | HRS Chapter 201H: state affordable projects with a required 50% + 1 affordable minimum |
| [Special districts](pathways/special-districts.md) | (not a separate pathway) | Districts with their own zoning rules, such as the Waikiki Apartment Precinct |

## Contributing

[Developer guide](development.md): where to make a change, and how to keep the package in sync with UHERO's Housing Policy Simulator.

## Project and Citywide view

UHERO's Housing Policy Simulator has two views, and these pages refer to both:

- **Project View:** analyzes a single hypothetical lot. The user sets every physical and financial input. In this package that is `calcSingle`.
- **Citywide View:** runs the same calculations across real parcels. Lot size, zone and height come from the parcel records, and the user adjusts only the financial and policy assumptions. In this package that is `calcParcel`.

## History

The model was originally inspired by the [Terner Center Development Calculator](https://ternercenter.berkeley.edu/proforma/). Unlike that tool, the current model evaluates feasibility through developer return metrics (levered IRR, return on cost, equity multiple and residual land value per square foot). It also models two developer strategies: a quick build ("dev flip", sell at stabilization) and a hold (refinance into permanent debt, collect cash flow, sell at exit).

The Housing Policy Simulator began as an R project ([documentation](https://github.com/UHERO/Terner-Center-Dashboard/blob/main/README.md#resources)), was rebuilt in TypeScript inside UHERO's dashboard codebase, and is published here as `@uhero/feasim`.
