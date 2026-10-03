// @uhero-data/policy-simulator — public entry point.
// Everything the package offers is exported from this file, and nothing else
// is part of its API.
// The model is copied from uhero_analytics (see README, "Source").

// the model: pathway pro formas, inputs/outputs types, defaults, zone helpers
export * from "./calculations";

// constants and helpers the gauge and calculator uses directly
export { DEFAULT_TARGET_RETURN, GRANT, zoneName } from "./calculations/calc-shared";

// real parcels: pathway envelope rules and default assumptions
export * from "./parcels";

// feasibility classifier applied to a model output
export * from "./feasibility";
