// Shared pipeline for calc-bill6.ts and calc-standard.ts, parameterized by
// the FAR and lot-coverage rule each one passes in.

import {
  allocatePropertyTax,
  article6Parking,
  calcBicycleParkingCost,
  calcConstructionInterest,
  calcDevRLV,
  calcDscrMaxLoan,
  calcLeaseupCarry,
  calcParkArea,
  calcParkingIncome,
  calcPredevEquity,
  calcPropertyTax,
  calcSoftCosts,
  commercialFracByZone,
  DEFAULT_PROFIT_MARGIN,
  DEFAULT_RETAIL_SHARE,
  DEFAULT_TARGET_RETURN,
  DEFAULT_TARGET_SPREAD,
  EFFICIENCY,
  envelopeCoverage,
  excavationDepthByZone,
  FEES,
  FINANCING,
  floorPlates,
  HOLD,
  INCOME,
  legalParkingRatio,
  lotAfterOpenSpace,
  mixAffordablePrice,
  mixFixtureUnits,
  mixRentByAmi,
  mixUnitSize,
  ParcelOutput,
  DEFAULT_PERMITTING_MONTHS,
  podiumEnvelope,
  resolveCapRate,
  DEFAULT_CONST_MONTHS,
  RETAIL_CAP_SPREAD,
  RETAIL_PREMIUM,
  runDevFlipStrategy,
  runHoldStrategy,
  sizeConstructionLoan,
  SliderInputs,
  StepBack,
  stepBackOf,
  VACANCY,
  zeroOutput,
  zoneStepBack,
} from "./calc-shared";

// defaults that differ in value between pathways that use this shared
// pipeline (today, only in name — bill6 and standard share every value)
export interface FarPathwayDefaults {
  equity: number;
  height_limit: number;
  floor_height: number;
  land_cost: number;
  permanent_rate: number;
  hold_years: number;
}

// the one real rule difference between pathways on this pipeline
export interface FarPathwayRules {
  calcFar: (zone_class: string, lot_sqft: number) => number;
  calcCoverage: (zone_class: string, lot_sqft: number) => number;
  defaults: FarPathwayDefaults;
}

// =========================================================
// STEP 1: HARD COSTS
// =========================================================

function farPathwayHard(
  rules: FarPathwayRules,
  zone_class: string,
  lot_sqft: number,
  height_limit: number,
  floor_height: number,
  unit_type: string,
  include_retail: boolean,
  setback: number,
  hard_cost_per_sqft: number,
  parking_ratio: number,
  retail_share: number,
  max_far?: number,
  stepback?: StepBack,
  open_space_bonus = 0,
  parking_exempt = false
) {
  const floors = Math.floor(height_limit / floor_height);

  const far = max_far ?? rules.calcFar(zone_class, lot_sqft) + open_space_bonus;
  const coverage = rules.calcCoverage(zone_class, lot_sqft);
  // waikiki precincts must keep 35–50% of the lot open; that and the coverage
  // cap are both measured on the zoning lot, so the stricter one governs
  const far_cap = far * lot_sqft;
  // per-storey floor plates
  const plates = floorPlates({
    floors,
    floor_height,
    height_limit,
    lot_sqft,
    coverage_plate:
      envelopeCoverage(zone_class, far, coverage) *
      lotAfterOpenSpace(lot_sqft, open_space_bonus),
    setback,
    stepback,
  });

  // commercial use checker, returns 0 if the selected zone isn't compatible
  const commercial_frac = include_retail ? commercialFracByZone(zone_class) : 0;
  const env = podiumEnvelope({
    plates,
    far_cap,
    retail_cap: commercial_frac * lot_sqft,
    retail_share,
    unit_size: mixUnitSize(unit_type),
    parking_ratio,
    ...article6Parking(lot_sqft, parking_exempt),
  });
  const gross_residential_sqft = env.residential_sqft;
  const gross_commercial_sqft = env.retail_sqft;
  // floor area counted toward FAR; parking is excluded
  const buildable_sqft = gross_residential_sqft + gross_commercial_sqft;
  const net_residential_sqft = gross_residential_sqft * EFFICIENCY;
  const net_commercial_sqft = gross_commercial_sqft * EFFICIENCY;

  const residential_rate = hard_cost_per_sqft ?? 450;
  const retail_rate = residential_rate + RETAIL_PREMIUM;
  const building_cost =
    (gross_residential_sqft + env.lobby_sqft) * residential_rate +
    gross_commercial_sqft * retail_rate;

  const max_units = env.units;

  // 8/26/26, for-sale units are discarded, 100% rental & 0% affordable rental
  // const afd_rent_units = Math.ceil(max_units * 0.05);
  const afd_rent_units = 0;
  const afd_sale_units = 0;
  const mkt_rent_units = Math.max(0, max_units - afd_rent_units);
  const mkt_sale_units = 0;
  const affordable_units = afd_rent_units;

  const parking_cost =
    env.parking_cost +
    calcBicycleParkingCost(env.bicycle_short_term, env.bicycle_long_term);
  // Park land charged on non-exempt units. §22-7.3(j)(1): Ch.29 affordable
  // units (rental + sale) are exempt.
  const chargeable_units = max_units - affordable_units;
  const park_area = calcParkArea(chargeable_units, buildable_sqft);
  const hard_cost = building_cost + parking_cost;

  return {
    buildable_sqft,
    net_residential_sqft,
    net_commercial_sqft,
    max_units,
    affordable_units,
    afd_rent_units,
    mkt_rent_units,
    afd_sale_units,
    mkt_sale_units,
    hard_cost,
    park_area,
    living_stories: env.living_stories,
    parking_stalls: env.stalls,
    loading_spaces: env.loading_spaces,
    bicycle_spaces: env.bicycle_short_term + env.bicycle_long_term,
    bicycle_short_term: env.bicycle_short_term,
    bicycle_long_term: env.bicycle_long_term,
    surface_stalls: env.surface_stalls,
    ground_floor_stalls: env.ground_floor_stalls,
    podium_stalls: env.podium_stalls,
    podium_levels: env.podium_levels,
    built_floors: env.built_floors,
    parking_sqft: env.parking_sqft,
    parking_share: env.parking_share,
  };
}

// =========================================================
// STEP 3: FINANCING
// =========================================================

function farPathwayLoanSizing(
  hard_cost: number,
  soft_cost: number,
  equity_pct: number,
  // 0 for the RLV loan (construction cost only), land cost for the deal loan
  land_in_base: number,
  // second pass: principal already sized to the DSCR take-out
  loan_principal_override?: number
) {
  const hard_cost_contingency = hard_cost * FINANCING.contingency;
  const total_dev_cost = hard_cost_contingency + soft_cost;
  const amount_to_finance = total_dev_cost + land_in_base;
  const loan_principal =
    loan_principal_override ?? amount_to_finance * (1 - equity_pct);
  const loan_fee = loan_principal * FINANCING.loan_fee;
  // the loan fee is due at closing and paid in equity
  const equity_amount = amount_to_finance + loan_fee - loan_principal;

  return {
    total_dev_cost,
    amount_to_finance,
    equity_amount,
    loan_principal,
    loan_fee,
  };
}

// =========================================================
// STEP 4: REVENUE
// =========================================================

function farPathwayRental(
  max_units: number,
  afd_rent_units: number,
  mkt_rent_units: number,
  const_months: number,
  permitting_months: number,
  total_carry_months: number,
  parking_stalls: number,
  net_commercial_sqft: number,
  unit_type: string,
  affordable_ami: string,
  market_ami: string,
  retail_rent: number
) {
  // affordable rent caps reset with each year's hud limits (roh 32-1.1 uses
  // the current ami), so they escalate over permitting like market rents
  const afd_rent_multiplier =
    FINANCING.ami_escalation **
    ((permitting_months + const_months + total_carry_months) / 12);
  const mkt_rent_multiplier =
    FINANCING.ami_escalation **
    ((permitting_months + const_months + total_carry_months) / 12);

  const affordable_rent =
    mixRentByAmi(affordable_ami, unit_type) * afd_rent_multiplier;
  const market_rent = mixRentByAmi(market_ami, unit_type) * mkt_rent_multiplier;

  const pri =
    affordable_rent * afd_rent_units * 12 + market_rent * mkt_rent_units * 12;

  const parking_income = calcParkingIncome(parking_stalls);
  const admin_income =
    max_units * 0.3 * INCOME.application_fee +
    max_units * 0.7 * INCOME.lease_renewal;

  const pgi = pri + parking_income + admin_income;
  const vacancy_loss = pgi * VACANCY.rental;

  const retail_pgi =
    net_commercial_sqft * retail_rent * 12 * mkt_rent_multiplier;
  const retail_vacancy_loss = retail_pgi * VACANCY.default;
  const residential_egi = pgi - vacancy_loss;
  const retail_egi = retail_pgi - retail_vacancy_loss;
  const egi = residential_egi + retail_egi;

  return { pri, pgi, egi, retail_pgi, retail_egi, residential_egi };
}

// =========================================================
// STEP 5: SALE VALUE
// =========================================================

// unreachable in both pathways today: afd_sale_units and mkt_sale_units are
// always 0 (see farPathwayHard), so gross_sales never moves off the zero
// `sale` constant each entry point sets directly. Kept as-is, unmodified,
// since reconciling that is a product decision, not part of this refactor.
function farPathwaySale(
  afd_sale_units: number,
  mkt_sale_units: number,
  const_months: number,
  permitting_months: number,
  total_carry_months: number,
  unit_type: string,
  affordable_ami_pct: number,
  market_ami_pct: number,
  permanent_rate: number
) {
  const afd_sale_multiplier =
    FINANCING.ami_escalation ** ((const_months + total_carry_months) / 12);
  const mkt_sale_multiplier =
    FINANCING.ami_escalation **
    ((permitting_months + const_months + total_carry_months) / 12);

  const afd_price =
    mixAffordablePrice(unit_type, affordable_ami_pct, permanent_rate) *
    afd_sale_multiplier;
  const mkt_price =
    mixAffordablePrice(unit_type, market_ami_pct, permanent_rate) *
    mkt_sale_multiplier;

  const afd_sales = afd_sale_units * afd_price;
  const mkt_sales = mkt_sale_units * mkt_price;

  return { gross_sales: afd_sales + mkt_sales, afd_sales, mkt_sales };
}

// =========================================================
// STEP 6: OPERATING EXPENSES
// =========================================================

function farPathwayOpex(
  residential_egi: number,
  retail_egi: number,
  opex_ratio: number
) {
  const residential_opex = residential_egi * opex_ratio;
  const retail_opex = retail_egi * opex_ratio;
  const operating_expenses = residential_opex + retail_opex;

  return { residential_opex, retail_opex, operating_expenses };
}

// =========================================================
// STEP 7: NOI & GDV (gross, no disposition cost)
// =========================================================

function farPathwayNoi(
  residential_egi: number,
  retail_egi: number,
  residential_opex: number,
  retail_opex: number,
  gross_sales: number,
  const_months: number,
  permitting_months: number,
  total_carry_months: number,
  property_tax: number,
  cap_rate_override?: number
) {
  const cap_rate = resolveCapRate(cap_rate_override);

  // NOI is after property tax (buyer pays it, so value reflects it)
  const tax = allocatePropertyTax(property_tax, residential_egi, retail_egi);
  const residential_noi =
    residential_egi - residential_opex - tax.residential_tax;
  const retail_noi = retail_egi - retail_opex - tax.retail_tax;
  const noi = residential_noi + retail_noi;

  // GDV = gross capitalized value
  const rental_gdv = residential_noi / cap_rate;

  let retail_gdv_val = 0;
  if (retail_egi > 0) {
    const retail_cap_rate = cap_rate + RETAIL_CAP_SPREAD;
    retail_gdv_val = retail_noi / retail_cap_rate;
  }

  const gdv = rental_gdv + retail_gdv_val + gross_sales;

  const project_years =
    (permitting_months + const_months + total_carry_months) / 12;

  return { noi, gdv, cap_rate, project_years, property_tax };
}

// Step 9 (developer feasibility: the hold and flip exit strategies) now
// lives in calc-shared.ts as runDevFlipStrategy/runHoldStrategy, shared with
// calc-h201.ts and calc-tod.ts — bill6, standard, and those two have
// identical hold/flip math (h201 and tod round a couple of extra fields,
// and tod's property tax follows its own 15-year exemption; see
// runDevFlipStrategy/runHoldStrategy's `round_totals`/`taxRule` options).

// =========================================================
// MAIN ENTRY
// =========================================================

export function runFarPathwaySingle(
  sliders: SliderInputs,
  rules: FarPathwayRules
): ParcelOutput {
  const { defaults } = rules;
  const lot_sqft = sliders.lot_sqft ?? 5000;
  const height_limit = sliders.height_limit ?? defaults.height_limit;
  const unit_type = sliders.unit_type ?? "studio50_1br50";
  const zone_class = sliders.zone_class ?? "AMX-1";
  const max_far = sliders.max_far;
  const leaseup_override = sliders.leaseup_months;
  const equity = sliders.equity ?? defaults.equity;
  const land_cost = sliders.land_cost ?? defaults.land_cost;
  const permanent_rate = sliders.permanent_rate ?? defaults.permanent_rate;
  const hold_years = sliders.hold_years ?? defaults.hold_years;
  const amort_years = sliders.amort_years ?? HOLD.amort_years;
  const min_dscr = sliders.min_dscr ?? 1.2;
  // park dedication is only waived under Bill 7 (ROH 43-10.8); every other
  // pathway pays the in-lieu fee unless the caller says otherwise
  const park = sliders.park ?? "in_lieu";
  const include_retail = sliders.include_retail ?? false;
  const retail_rent = sliders.retail_rent ?? 5;
  const affordable_ami = sliders.affordable_ami ?? "ami_50";
  const market_ami = sliders.market_ami ?? "ami_120";
  const construction_rate =
    sliders.construction_rate ?? FINANCING.construction_rate;
  const impact_fee_per_unit = sliders.impact_fee ?? FEES.impact.per_dwelling;
  const waivable_fee_basis = sliders.waivable_fee_basis ?? "market_units";
  const floor_height = sliders.floor_height ?? defaults.floor_height;
  const permitting_months_val =
    sliders.permitting_months ?? DEFAULT_PERMITTING_MONTHS;
  const setback = sliders.setback ?? 10;
  const hard_cost_per_sqft = sliders.hard_cost_per_sqft ?? 450;
  // Article 6 minimum unless the lever is set (§ 21-6.20)
  const parking_ratio =
    sliders.parking_ratio ??
    (sliders.parking_exempt ? 0 : legalParkingRatio(unit_type));
  const retail_share = sliders.retail_share ?? DEFAULT_RETAIL_SHARE;

  // Step 1: Hard costs
  const hard = farPathwayHard(
    rules,
    zone_class,
    lot_sqft,
    height_limit,
    floor_height,
    unit_type,
    include_retail,
    setback,
    hard_cost_per_sqft,
    parking_ratio,
    retail_share,
    max_far,
    stepBackOf(sliders, zoneStepBack(zone_class)),
    sliders.open_space_bonus ?? 0,
    sliders.parking_exempt ?? false
  );
  if (hard.max_units <= 0)
    return zeroOutput("hypothetical", zone_class, lot_sqft, height_limit);

  // Construction cost inflation: costs are spent throughout the build, so the average dollar lands at permitting + const/2.
  const const_months = sliders.const_months || DEFAULT_CONST_MONTHS;
  const cost_inflation_multiplier =
    FINANCING.cost_inflation **
    ((permitting_months_val + const_months / 2) / 12);
  const hard_cost = hard.hard_cost * cost_inflation_multiplier;

  // Step 2: Soft costs
  const soft = calcSoftCosts({
    hard_cost,
    lot_sqft,
    max_units: hard.max_units,
    affordable_units: hard.affordable_units,
    excavation_depth: excavationDepthByZone(zone_class),
    park,
    park_area: hard.park_area,
    land_cost_per_sqft: land_cost,
    waivable_fee_basis,
    impact_fee_per_unit,
    living_stories: hard.living_stories,
    fu_per_unit: mixFixtureUnits(unit_type),
  });
  const soft_cost = soft.total;

  // Step 3: Financing
  const construct_cost = hard_cost + soft_cost;
  const rental_units = hard.afd_rent_units + hard.mkt_rent_units;
  const sale_units = hard.afd_sale_units + hard.mkt_sale_units;

  // financing runs in two passes for RLV vs ROC & etc
  // RLV doesn't include land, the rest do
  const financeAt = (
    land_in_base: number,
    loan_principal_override?: number
  ) => {
    const loan = farPathwayLoanSizing(
      hard_cost,
      soft_cost,
      equity,
      land_in_base,
      loan_principal_override
    );

    // pre-dev equity (no compounding, IRR handles time cost)
    // drawn from the equity left after the land purchase
    const predev = calcPredevEquity(
      construct_cost,
      permitting_months_val,
      loan.equity_amount - land_in_base
    );

    const const_int = calcConstructionInterest(
      loan.loan_principal,
      const_months,
      construction_rate
    );

    const leaseup = calcLeaseupCarry(
      const_int.final_principal,
      rental_units,
      sale_units,
      construction_rate,
      leaseup_override
    );

    // total financing cost = real debt costs only (no predev carry)
    const total_financing_cost =
      loan.loan_fee + const_int.total_interest + leaseup.carry_interest;
    return { loan, predev, const_int, leaseup, total_financing_cost };
  };
  const land_cost_total = land_cost * lot_sqft;
  const ltc_pass = financeAt(0);
  const total_carry_months = ltc_pass.leaseup.total_carry_months;
  const total_months =
    permitting_months_val + const_months + total_carry_months;

  // Step 4: Revenue
  const rev = farPathwayRental(
    hard.max_units,
    hard.afd_rent_units,
    hard.mkt_rent_units,
    const_months,
    permitting_months_val,
    total_carry_months,
    hard.parking_stalls,
    hard.net_commercial_sqft,
    unit_type,
    affordable_ami,
    market_ami,
    retail_rent
  );

  // Step 5: Sale value (8/26/2026 for-sale units discarded)
  const sale = { gross_sales: 0, afd_sales: 0, mkt_sales: 0 };

  // Step 6: Operating expenses
  // market projects, property tax included (DEFAULT_INPUTS)
  const opex_ratio = sliders.opex_ratio ?? 0.3;
  const opex = farPathwayOpex(rev.residential_egi, rev.retail_egi, opex_ratio);

  // Step 7: NOI & GDV
  // full property tax from year 1 (no exemption in this pathway)
  const property_tax = calcPropertyTax(land_cost * lot_sqft, hard_cost);
  const noi_result = farPathwayNoi(
    rev.residential_egi,
    rev.retail_egi,
    opex.residential_opex,
    opex.retail_opex,
    sale.gross_sales,
    const_months,
    permitting_months_val,
    total_carry_months,
    property_tax,
    sliders.cap_rate
  );

  // Step 7b: size the construction loan to the DSCR take-out
  // the hold period takes in DSCR while flip period ignores it
  const take_out =
    hold_years > 0
      ? calcDscrMaxLoan(noi_result.noi, permanent_rate, amort_years, min_dscr)
      : null;
  // two loans, one for each framework the card reports
  // loan A (RLV basis): sized on construction cost only
  // loan B (deal basis): sized on construction cost plus land
  // where the DSCR binds the two coincide; they differ only when LTC is binding
  const rlv_sizing = sizeConstructionLoan(
    ltc_pass.loan.amount_to_finance,
    equity,
    ltc_pass.leaseup.final_principal,
    take_out
  );
  const rlv_financing_cost = (
    rlv_sizing.dscr_binds ? financeAt(0, rlv_sizing.loan_principal) : ltc_pass
  ).total_financing_cost;

  const deal_ltc = financeAt(land_cost_total);
  const sizing = sizeConstructionLoan(
    deal_ltc.loan.amount_to_finance,
    equity,
    deal_ltc.leaseup.final_principal,
    take_out
  );
  const { loan, predev, leaseup, total_financing_cost } = sizing.dscr_binds
    ? financeAt(land_cost_total, sizing.loan_principal)
    : deal_ltc;

  // Step 8: Developer RLV (no grants on this pathway)
  const rlv = calcDevRLV(
    noi_result.gdv,
    loan.total_dev_cost,
    rlv_financing_cost,
    [], // no grants on this pathway
    lot_sqft,
    total_months,
    sliders.target_return ?? DEFAULT_TARGET_RETURN,
    sliders.profit_margin ?? DEFAULT_PROFIT_MARGIN
  );

  // Step 9: Developer feasibility
  const dev =
    hold_years === 0
      ? runDevFlipStrategy({
          equity_amount: loan.equity_amount,
          loan_balance: leaseup.final_principal,
          gdv: noi_result.gdv,
          noi: noi_result.noi,
          dev_cost: loan.total_dev_cost,
          total_financing_cost,
          total_months,
          permitting_months: permitting_months_val,
          monthly_predev_spend: predev.monthly_predev_spend,
          land_cost_sqft: land_cost,
          lot_sqft,
        })
      : runHoldStrategy({
          equity_amount: loan.equity_amount,
          loan_balance: leaseup.final_principal,
          gdv: noi_result.gdv,
          noi: noi_result.noi,
          egi: rev.egi,
          operating_expenses: opex.operating_expenses,
          dev_cost: loan.total_dev_cost,
          total_financing_cost,
          hard_cost,
          total_months,
          permitting_months: permitting_months_val,
          monthly_predev_spend: predev.monthly_predev_spend,
          land_cost_sqft: land_cost,
          lot_sqft,
          permanent_rate,
          hold_years,
          amort_years,
          min_dscr,
          cap_rate: noi_result.cap_rate,
          gross_sales: sale.gross_sales,
        });

  const _roc = dev.dev_roc ?? 0;
  const _entry_cap = noi_result.cap_rate;
  const _target_spread = sliders.target_spread ?? DEFAULT_TARGET_SPREAD;
  const _investment_spread = _roc - _entry_cap;
  const _target_roc = _entry_cap + _target_spread;

  return {
    tmk: "hypothetical",
    zone_class,
    lot_sqft,
    height_limit,
    buildable_sqft: hard.buildable_sqft,
    net_residential_sqft: hard.net_residential_sqft,
    net_commercial_sqft: hard.net_commercial_sqft,
    max_units: hard.max_units,
    parking_stalls: hard.parking_stalls,
    loading_spaces: hard.loading_spaces,
    bicycle_spaces: hard.bicycle_spaces,
    bicycle_short_term: hard.bicycle_short_term,
    bicycle_long_term: hard.bicycle_long_term,
    surface_stalls: hard.surface_stalls,
    ground_floor_stalls: hard.ground_floor_stalls,
    podium_stalls: hard.podium_stalls,
    podium_levels: hard.podium_levels,
    built_floors: hard.built_floors,
    built_height: hard.built_floors * floor_height,
    parking_sqft: hard.parking_sqft,
    parking_share: hard.parking_share,
    affordable_units: hard.affordable_units,
    afd_rent_units: hard.afd_rent_units,
    mkt_rent_units: hard.mkt_rent_units,
    afd_sale_units: hard.afd_sale_units,
    mkt_sale_units: hard.mkt_sale_units,
    hard_cost: hard_cost,
    soft_cost,
    soft_cost_breakdown: soft,
    dev_cost: loan.total_dev_cost,
    total_financing_cost,
    rlv_financing_cost,
    pre_construction_subsidy: 0,
    equity_amount: loan.equity_amount,
    dev_equity_pct_realized: sizing.equity_pct_realized,
    dev_dscr_binds: sizing.dscr_binds,
    loan_balance_at_stab: leaseup.final_principal,
    total_predev_cost: predev.total_predev_cost,
    construction_equity: predev.construction_equity,
    permitting_months: permitting_months_val,
    const_months,
    leaseup_months: leaseup.leaseup_months,
    sales_months: leaseup.sales_months,
    total_carry_months: leaseup.total_carry_months,
    total_months,
    project_years: noi_result.project_years,
    pri: rev.pri,
    pgi: rev.pgi,
    residential_egi: rev.residential_egi,
    retail_pgi: rev.retail_pgi,
    retail_egi: rev.retail_egi,
    egi: rev.egi,
    gross_sales: sale.gross_sales,
    afd_sales: sale.afd_sales,
    mkt_sales: sale.mkt_sales,
    residential_opex: opex.residential_opex,
    retail_opex: opex.retail_opex,
    operating_expenses: opex.operating_expenses,
    property_tax: noi_result.property_tax,
    noi: noi_result.noi,
    cap_rate: noi_result.cap_rate,
    gdv: noi_result.gdv,
    rlv_selling_costs: rlv.selling_costs,
    rlv_grants_pv: rlv.grants_pv,
    rlv_land_carry: rlv.land_carry,
    rlv_profit: rlv.profit,
    rlv_project_cost: rlv.project_cost,
    rlv: rlv.rlv,
    rlv_sqft: rlv.rlv_sqft,
    dev_investment_spread: Math.round(_investment_spread * 10000) / 10000,
    dev_target_roc: Math.round(_target_roc * 10000) / 10000,
    dev_is_feasible: _roc >= _target_roc,
    ...(dev as Partial<ParcelOutput>),
  } as ParcelOutput;
}
