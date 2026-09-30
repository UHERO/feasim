// @uhero-data/policy-simulator — public entry point.
//
// Everything the package offers is exported from this file, and nothing else
// is part of its API.
//
//   calcSingle(inputs)   one parcel's pro forma; `inputs.program` picks the
//                        pathway (bill6, bill7, standard, tod, h201)
//   SliderInputs         the inputs type; ParcelOutput the outputs type
//   *_DEFAULT_*          each pathway's default assumptions
//   calcFAR, calcFarBill6 and other zoning helpers
//   calcParcel(program, parcel, levers)
//                        a real parcel's pro forma, with the pathway's height
//                        and FAR rules applied (parcelInputs builds its inputs,
//                        pathwayEnvelope gives the height/FAR, DEFAULT_INPUTS
//                        each pathway's default assumptions)
//   overallLevel(output) and the other feasibility helpers: the strong /
//                        marginal / poor verdict the UHERO tools display
//
// The model is copied from uhero_analytics (see README, "Source").

// the model: pathway pro formas, inputs/outputs types, defaults, zone helpers
export * from "./calculations";

// real parcels: pathway envelope rules and default assumptions
export * from "./parcels";

// feasibility classifier applied to a model output
export * from "./feasibility";
