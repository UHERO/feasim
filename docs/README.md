# @uhero/feasim documentation

How the model works and where its numbers come from. The [README](../README.md) covers installing the package, the API and examples; these pages are the methodology reference behind it.

## Start here

- [Housing Policy Simulator logic](simulator-logic.md): the pipeline every pathway runs, from the building envelope through costs, financing, revenue and residual land value to the verdict.
- [Variables](variables.md): every lever, constant and calculation function in the code, with its value, source and how often to review it, followed by the assumption history: retired assumptions and what the model does now, and loopholes.
- [Developer guide](development.md): setup, where to make a change, the tests, and how commits and releases work.

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

## Project and Citywide view

UHERO's Housing Policy Simulator has two views, and these pages refer to both:

- **Project View:** analyzes a single hypothetical lot. The user sets every physical and financial input. In this package that is `calcSingle`.
- **Citywide View:** runs the same calculations across real parcels. Lot size, zone and height come from the parcel records, and the user adjusts only the financial and policy assumptions. In this package that is `calcParcel`.

## Background reading

- [201-H Process Summary](https://dbedt.hawaii.gov/hhfdc/files/2023/05/2023-05-18-201H-Process-FINAL.pdf): 201H and its requirements
- [Parcels & Zoning Dashboard](https://cchnl.maps.arcgis.com/apps/webappviewer/index.html?id=96d4994d61cc495fa1a8524b3b116eee): an interactive map of Oʻahu's parcels
- [Honolulu Inclusionary Housing Flowchart](https://miro.com/app/board/uXjVJaPZAJQ=/): flowchart of Oʻahu's affordability regulations
- [Development Flowchart](https://miro.com/app/live-embed/uXjVJDi57jk=/?embedMode=view_only_without_ui&moveToViewport=-2298%2C-1870%2C3822%2C2086&embedId=247174178665): the housing development process
- [Housing Policy Simulator Variables Spreadsheet V1](https://docs.google.com/spreadsheets/d/1_sSlavakP_3b8Ssv547RV-63rOuHqrqrIfim9JED3XU/edit?usp=sharing): the older version of the variables spreadsheet, with every variable and its source

## History

The model was originally inspired by the [Terner Center Development Calculator](https://ternercenter.berkeley.edu/proforma/). Unlike that tool, the current model evaluates feasibility through developer return metrics (levered IRR, return on cost, equity multiple and residual land value per square foot). It also models two developer strategies: a quick build ("dev flip", sell at stabilization) and a hold (refinance into permanent debt, collect cash flow, sell at exit).

The Housing Policy Simulator began as an R project ([documentation](https://github.com/UHERO/Terner-Center-Dashboard/blob/main/README.md#resources)), was rebuilt in TypeScript inside UHERO's dashboard codebase, and is published here as `@uhero/feasim`.
