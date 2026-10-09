// Standard Development calculator:
//
// Key Standard rules:
// - Base FAR (no bonus), zone-based lot coverage
// - Surface car parking required (no bicycle)
// - 5% affordable rental, 15% affordable sale
// - User-selectable AMI levels
// - No grants/subsidies
// - Full property tax from year 1 (NO exemption period)
// - Retail allowed for AMX/BMX zones only
// - Zone-based permitting months
// - Parking income included in PGI

import {
  allocatePropertyTax,
  article6Parking,
  calcBicycleParkingCost,
  calcConstructionInterest,
  calcDevRLV,
  calcDscrMaxLoan,
  calcFAR,
  calcLeaseupCarry,
  calcParkArea,
  calcParkingIncome,
  calcPermanentLoan,
  calcPredevEquity,
  calcPropertyTax,
  calcSoftCosts,
  commercialFracByZone,
  DEFAULT_PROFIT_MARGIN,
  DEFAULT_RETAIL_SHARE,
  DEFAULT_TARGET_RETURN,
  DEFAULT_TARGET_SPREAD,
  DEFAULT_UNIT_TYPE,
  EFFICIENCY,
  envelopeCoverage,
  equityFirstDraws,
  excavationDepthByZone,
  EXPENSES,
  FEES,
  FINANCING,
  floorPlates,
  HOLD,
  INCOME,
  legalParkingRatio,
  lotAfterOpenSpace,
  lotCoverage,
  mixAffordablePrice,
  mixFixtureUnits,
  mixRentByAmi,
  mixUnitSize,
  ParcelOutput,
  permittingMonthsByZone,
  podiumEnvelope,
  resolveCapRate,
  resolveConstMonths,
  RETAIL_CAP_SPREAD,
  RETAIL_PREMIUM,
  sizeConstructionLoan,
  SliderInputs,
  solveIRR,
  StepBack,
  stepBackOf,
  VACANCY,
  zeroOutput,
  zoneStepBack,
} from "./calc-shared";

// =========================================================
// DEFAULTS
// =========================================================

export const STD_DEFAULT_EQUITY = 0.3;
export const STD_DEFAULT_HEIGHT_LIMIT = 30;
export const STD_DEFAULT_FLOOR_HEIGHT = 10;
export const STD_DEFAULT_LAND_COST = 200;
export const STD_DEFAULT_PERMANENT_RATE = 0.0675;
export const STD_DEFAULT_HOLD_YEARS = 10;

// =========================================================
// STEP 1: HARD COSTS
// =========================================================

function standardHard(
  zone_class: string,
  lot_sqft: number,
  height_limit: number,
  floor_height: number,
  unit_type: string,
  rental_split: number,
  sale_split: number,
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

  const far = max_far ?? calcFAR(zone_class, lot_sqft) + open_space_bonus;
  const coverage = lotCoverage(zone_class, lot_sqft);
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
    podium_levels: env.podium_levels,
    parking_sqft: env.parking_sqft,
    parking_share: env.parking_share,
  };
}

// =========================================================
// STEP 3: FINANCING
// =========================================================

function standardLoanSizing(
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

function standardRental(
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
  const afd_rent_multiplier =
    FINANCING.ami_escalation ** ((const_months + total_carry_months) / 12);
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

function standardSale(
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

function standardOpex(
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

function standardNoi(
  residential_egi: number,
  retail_egi: number,
  residential_opex: number,
  retail_opex: number,
  gross_sales: number,
  zone_class: string,
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

// =========================================================
// STEP 9: DEVELOPER FEASIBILITY
// =========================================================

function standardDevFlip(
  equity_amount: number,
  loan_balance: number,
  gdv: number,
  noi: number,
  dev_cost: number,
  total_financing_cost: number,
  total_predev_cost: number,
  total_months: number,
  permitting_months: number,
  monthly_predev_spend: number,
  construction_equity: number,
  land_cost_sqft: number,
  lot_sqft: number
): Partial<ParcelOutput> {
  // disposition cost at sale only
  const selling_costs = gdv * FINANCING.disposition_cost;
  const equity_out = gdv - selling_costs - loan_balance;

  // monthly cashflow: predev spread across permitting, construction equity at close, exit at end
  const land_cost = land_cost_sqft * lot_sqft;
  // the deal loan's base includes land, so equity_amount already carries
  // the developer's share of the land purchase
  const total_equity_invested = equity_amount;

  const cashflows = new Array(total_months + 1).fill(0);
  // equity first: land, then predev, then the balance at loan closing
  equityFirstDraws(
    equity_amount,
    land_cost,
    monthly_predev_spend,
    permitting_months
  ).forEach((d, m) => {
    cashflows[m] += d;
  });
  cashflows[total_months] = equity_out;

  const levered_irr = solveIRR(cashflows, true);
  const equity_multiple = equity_out / total_equity_invested;
  const roi = (equity_out - total_equity_invested) / total_equity_invested;

  const total_dev_cost = dev_cost + land_cost + total_financing_cost;
  const profit = gdv - selling_costs - total_dev_cost;
  const roc = noi / total_dev_cost;

  return {
    dev_strategy: "dev_flip",
    dev_hold_years: 0,
    dev_post_grant: 0,
    dev_land_cost: land_cost,
    dev_total_dev_cost: total_dev_cost,
    dev_capital_subsidy: 0,
    dev_net_dev_cost: total_dev_cost,
    dev_levered_irr: Math.round(levered_irr * 10000) / 10000,
    dev_equity_multiple: Math.round(equity_multiple * 100) / 100,
    dev_profit: Math.round(profit),
    dev_roi: Math.round(roi * 10000) / 10000,
    dev_roc: Math.round(roc * 10000) / 10000,
    dev_gdv: gdv,
    dev_selling_costs: Math.round(selling_costs),
    dev_equity_out: Math.round(equity_out),
    dev_loan_payoff: Math.round(loan_balance),
    dev_perm_principal: null,
    dev_perm_rate: null,
    dev_annual_debt_svc: null,
    dev_dscr: null,
    dev_is_bankable: null,
    dev_cash_on_cash: null,
    dev_entry_cap: null,
    dev_exit_cap: null,
    dev_yr1_prop_tax: null,
    dev_equity_invested: total_equity_invested,
  };
}

function standardHold(
  equity_amount: number,
  loan_balance: number,
  gdv: number,
  noi: number,
  egi: number,
  operating_expenses: number,
  dev_cost: number,
  total_financing_cost: number,
  total_predev_cost: number,
  hard_cost: number,
  total_months: number,
  land_cost_sqft: number,
  lot_sqft: number,
  permanent_rate: number,
  hold_years: number,
  amort_years: number,
  min_dscr: number,
  cap_rate: number,
  gross_sales: number
): Partial<ParcelOutput> {
  const land_cost = land_cost_sqft * lot_sqft;
  const land_value = land_cost;
  const improvement_value = hard_cost;
  const tax_rate = FINANCING.rpt_residential;
  // the deal loan's base includes land, so equity_amount already carries
  // the developer's share of the land purchase
  const total_equity_invested = equity_amount;

  // Sale units sold at stabilization, pay down construction loan first
  const sale_selling_costs = gross_sales * FINANCING.disposition_cost;
  const net_sale_proceeds = gross_sales - sale_selling_costs;
  const perm_loan_balance = Math.max(0, loan_balance - net_sale_proceeds);
  const excess_sale_cash = Math.max(0, net_sale_proceeds - loan_balance);

  // Calculate before perm loan sizing
  const yr1_prop_tax = (land_value + improvement_value) * tax_rate;
  const yr1_noi_after_tax = egi - operating_expenses - yr1_prop_tax;

  // Permanent loan sized only on remaining rental balance
  const perm = calcPermanentLoan(
    perm_loan_balance,
    yr1_noi_after_tax,
    permanent_rate,
    hold_years,
    amort_years,
    min_dscr
  );

  const dscr_display = perm_loan_balance === 0 ? null : perm.dscr;
  const is_bankable_display = perm_loan_balance === 0 ? null : perm.is_bankable;

  const entry_cap = cap_rate;
  const exit_cap = entry_cap + HOLD.exit_cap_spread;

  const hold_months = hold_years * 12;
  const total_with_hold = total_months + hold_months;
  const cf = new Array(total_with_hold + 1).fill(0);

  // land cost now included
  cf[0] = -equity_amount;
  // sale unit proceeds arrive at stabilization
  cf[total_months] += excess_sale_cash;

  let current_egi = egi,
    current_opex = operating_expenses;
  // assessed value is reassessed annually, not frozen at cost
  let assessed_value = land_value + improvement_value;
  let stored_selling_costs = 0;

  for (let yr = 1; yr <= hold_years; yr++) {
    if (yr > 1) {
      current_egi *= 1 + HOLD.annual_rent_growth;
      // expenses run on their own inflation series, not as a fixed share of EGI
      current_opex *= 1 + HOLD.annual_opex_growth;
      assessed_value *= 1 + HOLD.annual_assessment_growth;
    }
    const prop_tax = assessed_value * tax_rate;
    const current_noi = current_egi - current_opex - prop_tax;
    const levered_cf = current_noi - perm.annual_debt_svc;

    const monthly_cf = levered_cf / 12;
    for (let mo = 1; mo <= 12; mo++) {
      cf[total_months + (yr - 1) * 12 + mo] = monthly_cf;
    }

    if (yr === hold_years) {
      const forward_noi = current_noi * (1 + HOLD.annual_rent_growth);
      const gross_sale = forward_noi / exit_cap;
      stored_selling_costs = gross_sale * FINANCING.disposition_cost;
      const net_reversion =
        gross_sale - stored_selling_costs - perm.remaining_bal;
      cf[total_with_hold] += net_reversion;
    }
  }

  const annual_irr = solveIRR(cf, true);
  const total_cash_in = cf.reduce((s, v) => s + Math.max(0, v), 0);
  const equity_multiple = total_cash_in / total_equity_invested;
  const roi = (total_cash_in - total_equity_invested) / total_equity_invested;
  const profit = total_cash_in - total_equity_invested;
  const yr1_levered_cf = yr1_noi_after_tax - perm.annual_debt_svc;
  const cash_on_cash = yr1_levered_cf / total_equity_invested;
  const total_dev_cost = dev_cost + land_cost + total_financing_cost;
  const roc = noi / total_dev_cost;

  return {
    dev_strategy: "hold",
    dev_hold_years: hold_years,
    dev_post_grant: 0,
    dev_land_cost: land_cost,
    dev_total_dev_cost: total_dev_cost,
    dev_capital_subsidy: 0,
    dev_net_dev_cost: total_dev_cost,
    dev_levered_irr: Math.round(annual_irr * 10000) / 10000,
    dev_equity_multiple: Math.round(equity_multiple * 100) / 100,
    dev_profit: Math.round(profit),
    dev_roi: Math.round(roi * 10000) / 10000,
    dev_roc: Math.round(roc * 10000) / 10000,
    dev_gdv: gdv,
    dev_selling_costs: Math.round(stored_selling_costs),
    dev_equity_out: Math.round(total_cash_in),
    dev_loan_payoff: perm.remaining_bal,
    dev_dscr: dscr_display,
    dev_is_bankable: is_bankable_display,
    dev_annual_debt_svc: perm_loan_balance === 0 ? null : perm.annual_debt_svc,
    dev_perm_principal: perm_loan_balance === 0 ? null : perm.perm_principal,
    dev_cash_on_cash: Math.round(cash_on_cash * 10000) / 10000,
    dev_entry_cap: Math.round(entry_cap * 10000) / 10000,
    dev_exit_cap: Math.round(exit_cap * 10000) / 10000,
    dev_yr1_prop_tax: Math.round(yr1_prop_tax),
    dev_perm_rate: perm_loan_balance === 0 ? null : permanent_rate,
    dev_equity_invested: total_equity_invested,
  };
}

// =========================================================
// MAIN ENTRY: calcStandardSingle
// =========================================================

export function calcStandardSingle(sliders: SliderInputs): ParcelOutput {
  const lot_sqft = sliders.lot_sqft ?? 5000;
  const height_limit = sliders.height_limit ?? STD_DEFAULT_HEIGHT_LIMIT;
  const unit_type = sliders.unit_type ?? DEFAULT_UNIT_TYPE;
  const zone_class = sliders.zone_class ?? "AMX-1";
  const max_far = sliders.max_far;
  const rental_split = 1;
  const sale_split = 0;
  const leaseup_override = sliders.leaseup_months;
  const equity = sliders.equity ?? STD_DEFAULT_EQUITY;
  const land_cost = sliders.land_cost ?? STD_DEFAULT_LAND_COST;
  const permanent_rate = sliders.permanent_rate ?? STD_DEFAULT_PERMANENT_RATE;
  const hold_years = sliders.hold_years ?? STD_DEFAULT_HOLD_YEARS;
  const amort_years = sliders.amort_years ?? HOLD.amort_years;
  const min_dscr = sliders.min_dscr ?? 1.2;
  // park dedication is only waived under Bill 7 (ROH 43-10.8); every other
  // pathway pays the in-lieu fee unless the caller says otherwise
  const park = sliders.park ?? "in_lieu";
  const include_retail = sliders.include_retail ?? false;
  const retail_rent = sliders.retail_rent ?? 5;
  const affordable_ami = sliders.affordable_ami ?? "ami_50";
  const market_ami = sliders.market_ami ?? "ami_50";
  const construction_rate =
    sliders.construction_rate ?? FINANCING.construction_rate;
  const impact_fee_per_unit = sliders.impact_fee ?? FEES.impact.per_dwelling;
  const waivable_fee_basis = sliders.waivable_fee_basis ?? "market_units";
  const floor_height = sliders.floor_height ?? STD_DEFAULT_FLOOR_HEIGHT;
  const permitting_months_val =
    sliders.permitting_months ?? permittingMonthsByZone(zone_class);
  const setback = sliders.setback ?? 10;
  const hard_cost_per_sqft = sliders.hard_cost_per_sqft ?? 450;
  // Article 6 minimum unless the lever is set (§ 21-6.20)
  const parking_ratio =
    sliders.parking_ratio ??
    (sliders.parking_exempt ? 0 : legalParkingRatio(unit_type));
  const retail_share = sliders.retail_share ?? DEFAULT_RETAIL_SHARE;

  // Step 1: Hard costs
  const hard = standardHard(
    zone_class,
    lot_sqft,
    height_limit,
    floor_height,
    unit_type,
    rental_split,
    sale_split,
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
  const const_months = resolveConstMonths(zone_class, sliders.const_months);
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
    const loan = standardLoanSizing(
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
  const rev = standardRental(
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
  const opex_ratio = sliders.opex_ratio ?? EXPENSES.opex_ratio;
  const opex = standardOpex(rev.residential_egi, rev.retail_egi, opex_ratio);

  // Step 7: NOI & GDV
  // full property tax from year 1 (no exemption in this pathway)
  const property_tax = calcPropertyTax(land_cost * lot_sqft, hard_cost);
  const noi_result = standardNoi(
    rev.residential_egi,
    rev.retail_egi,
    opex.residential_opex,
    opex.retail_opex,
    sale.gross_sales,
    zone_class,
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
  const { loan, predev, const_int, leaseup, total_financing_cost } =
    sizing.dscr_binds
      ? financeAt(land_cost_total, sizing.loan_principal)
      : deal_ltc;

  // Step 8: Developer RLV (no grants for Standard)
  const rlv = calcDevRLV(
    noi_result.gdv,
    loan.total_dev_cost,
    rlv_financing_cost,
    0, // no affordable_units for grants in Standard
    "none", // no grant_type
    lot_sqft,
    total_months,
    sliders.target_return ?? DEFAULT_TARGET_RETURN,
    sliders.profit_margin ?? DEFAULT_PROFIT_MARGIN
  );

  // Step 9: Developer feasibility
  const dev =
    hold_years === 0
      ? standardDevFlip(
          loan.equity_amount,
          leaseup.final_principal,
          noi_result.gdv,
          noi_result.noi,
          loan.total_dev_cost,
          total_financing_cost,
          predev.total_predev_cost,
          total_months,
          permitting_months_val,
          predev.monthly_predev_spend,
          predev.construction_equity,
          land_cost,
          lot_sqft
        )
      : standardHold(
          loan.equity_amount,
          leaseup.final_principal,
          noi_result.gdv,
          noi_result.noi,
          rev.egi,
          opex.operating_expenses,
          loan.total_dev_cost,
          total_financing_cost,
          predev.total_predev_cost,
          hard_cost,
          total_months,
          land_cost,
          lot_sqft,
          permanent_rate,
          hold_years,
          amort_years,
          min_dscr,
          noi_result.cap_rate,
          sale.gross_sales
        );

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
    podium_levels: hard.podium_levels,
    parking_sqft: hard.parking_sqft,
    parking_share: hard.parking_share,
    affordable_units: hard.affordable_units,
    afd_rent_units: hard.afd_rent_units,
    mkt_rent_units: hard.mkt_rent_units,
    afd_sale_units: hard.afd_sale_units,
    mkt_sale_units: hard.mkt_sale_units,
    hard_cost: hard_cost,
    soft_cost,
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
    rlv_post_grant: rlv.post_construction_grant,
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
