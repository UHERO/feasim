// 201H (HRS Chapter 201H) calculator
//
// Key 201H rules:
//   - Base FAR (no bonus)
//   - 50% + 1 of total units must be affordable (validation error otherwise)
//   - User selects affordability % (≥ 50%+1 threshold)
//   - Affordable units split proportionally between rental & sale
//   - Surface car parking required (cost AND income)
//   - Retail allowed only for AMX-1/2/3, BMX-2/3/4 zones
//   - Impact fees are a user input (default $5,000/unit, vs $1,836 default elsewhere)
//   - Full property tax from year 1 (no exemption, unlike Bill 7's 15-yr improvement exemption)
//   - Permit/plan-review fees apply to MARKET units only (affordable exempt)
//   - Cap rate derived from height (low_rise ≤30ft, else mid_rise)

import {
  allocatePropertyTax,
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
  LOT_COVERAGE,
  mixFixtureUnits,
  mixRentByAmi,
  mixUnitSize,
  ParcelOutput,
  PARKING,
  podiumEnvelope,
  resolveCapRate,
  resolveConstMonths,
  RETAIL_CAP_SPREAD,
  RETAIL_PREMIUM,
  sizeConstructionLoan,
  SliderInputs,
  solveIRR,
  stepBackOf,
  VACANCY,
  zeroOutput,
  zoneStepBack,
} from "./calc-shared";

// =========================================================
// DEFAULTS
// =========================================================
export const H201_DEFAULT_HEIGHT_LIMIT = 60;
export const H201_DEFAULT_ZONE_CLASS = "A-2";
export const H201_DEFAULT_SALE_SPLIT = 0.4;
export const H201_DEFAULT_AFFORDABILITY = 0.51;
export const H201_DEFAULT_EQUITY = 0.3;
export const H201_DEFAULT_LAND_COST = 200;
export const H201_DEFAULT_PERMITTING_MO = 12;
export const H201_DEFAULT_PERMANENT_RATE = 0.0675;
export const H201_DEFAULT_HOLD_YEARS = 10;
export const H201_DEFAULT_RETAIL_RENT = 65;
export const H201_DEFAULT_AFFORDABLE_AMI = "ami_80";
export const H201_DEFAULT_MARKET_AMI = "ami_140";

// 201H regulatory floors
const H201_MIN_AFD_FRAC = 0.5;

// =========================================================
// MAIN ENTRY: calcH201Single
// =========================================================
export function calcH201Single(sliders: SliderInputs): ParcelOutput {
  const lot_sqft = sliders.lot_sqft ?? 5000;
  const height_limit = sliders.height_limit ?? H201_DEFAULT_HEIGHT_LIMIT;
  const zone_class = sliders.zone_class ?? H201_DEFAULT_ZONE_CLASS;
  const unit_type = sliders.unit_type ?? DEFAULT_UNIT_TYPE;
  const rental_split = 1;
  const sale_split = 0;
  const leaseup_override = sliders.leaseup_months;
  const affordability = sliders.affordability ?? H201_DEFAULT_AFFORDABILITY;
  const equity = sliders.equity ?? H201_DEFAULT_EQUITY;
  const land_cost = sliders.land_cost ?? H201_DEFAULT_LAND_COST;
  const permanent_rate = sliders.permanent_rate ?? H201_DEFAULT_PERMANENT_RATE;
  const hold_years = sliders.hold_years ?? H201_DEFAULT_HOLD_YEARS;
  const amort_years = sliders.amort_years ?? HOLD.amort_years;
  const min_dscr = sliders.min_dscr ?? 1.2;
  const include_retail = sliders.include_retail ?? false;
  const retail_rent = sliders.retail_rent ?? H201_DEFAULT_RETAIL_RENT;
  const affordable_ami = sliders.affordable_ami ?? H201_DEFAULT_AFFORDABLE_AMI;
  const market_ami = sliders.market_ami ?? H201_DEFAULT_MARKET_AMI;
  // park dedication is only waived under Bill 7 (ROH 43-10.8); every other
  // pathway pays the in-lieu fee unless the caller says otherwise
  const park = sliders.park ?? "in_lieu";
  const opex_ratio = sliders.opex_ratio ?? EXPENSES.opex_ratio;
  const construction_rate =
    sliders.construction_rate ?? FINANCING.construction_rate;
  const permitting_months =
    sliders.permitting_months ?? H201_DEFAULT_PERMITTING_MO;
  const impact_fee_per_unit = sliders.impact_fee ?? 0;
  const waivable_fee_basis = sliders.waivable_fee_basis ?? "market_units";
  const const_months = resolveConstMonths(zone_class, sliders.const_months);
  const hard_cost_per_sqft = sliders.hard_cost_per_sqft ?? 450;
  const parking_ratio = sliders.parking_ratio ?? PARKING.stalls_per_unit;
  const retail_share = sliders.retail_share ?? DEFAULT_RETAIL_SHARE;
  const setback = sliders.setback ?? 10;

  // 2. BUILDABLE ENVELOPE (h201_hard)
  const floors = Math.floor(height_limit / 10);
  const far = sliders.max_far ?? calcFAR(zone_class, lot_sqft);
  const coverage = LOT_COVERAGE[zone_class] ?? 0.6;
  // waikiki precincts must keep 35–50% of the lot open; that and the coverage
  // cap are both measured on the zoning lot, so the stricter one governs
  const far_cap = far * lot_sqft;
  // per-storey floor plates
  const plates = floorPlates({
    floors,
    floor_height: 10,
    height_limit,
    lot_sqft,
    coverage_plate: envelopeCoverage(zone_class, far, coverage) * lot_sqft,
    setback,
    stepback: stepBackOf(sliders, zoneStepBack(zone_class)),
  });

  // commercial use checker, returns 0 if the selected zone isn't compatible
  const frac = include_retail ? commercialFracByZone(zone_class) : 0;
  const unit_size = mixUnitSize(unit_type);
  const env = podiumEnvelope({
    plates,
    far_cap,
    retail_cap: frac * lot_sqft,
    retail_share,
    unit_size,
    parking_ratio,
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

  // 3. UNITS + AFFORDABILITY VALIDATION (50% + 1 rule)
  const max_units = env.units;

  if (max_units <= 0)
    return zeroOutput("hypothetical", zone_class, lot_sqft, height_limit);

  const min_affordable = Math.floor(max_units * H201_MIN_AFD_FRAC) + 1;
  const affordable_units = Math.ceil(max_units * affordability);

  if (affordable_units < min_affordable) {
    throw new Error(
      `201H: affordability=${affordability} too low. Need ≥${min_affordable} affordable units (50%+1 of ${max_units}), have ${affordable_units}. Min affordability = ${(min_affordable / max_units).toFixed(3)}.`
    );
  }

  // 8/26/26, for-sale units are discarded, 100% rental & 50%+1 of units affordable at <=140% AMI
  const afd_rent_units = affordable_units;
  const afd_sale_units = 0;
  const mkt_rent_units = Math.max(0, max_units - afd_rent_units);
  const mkt_sale_units = 0;
  const rental_units = max_units;
  const sale_units = 0;

  // 4. PARKING, CONSTRUCTION COSTS
  const parking_cost = env.parking_cost;
  // Park land charged only on non-exempt units, ROH 22-7.3(j)(3), 201H afd rental units are exempt
  const chargeable_units = max_units - afd_rent_units;
  const park_area = calcParkArea(chargeable_units, buildable_sqft);
  const hard_cost_base = building_cost + parking_cost;
  // construction cost inflation: costs are spent throughout the build, so the average dollar lands at permitting + const/2.
  const cost_inflation_multiplier =
    FINANCING.cost_inflation ** ((permitting_months + const_months / 2) / 12);
  const hard_cost = hard_cost_base * cost_inflation_multiplier;

  // STEP 5. SOFT COSTS
  const living_stories = env.living_stories;
  const soft = calcSoftCosts({
    hard_cost,
    lot_sqft,
    max_units,
    affordable_units,
    excavation_depth: excavationDepthByZone(zone_class),
    park,
    park_area,
    land_cost_per_sqft: land_cost,
    waivable_fee_basis,
    impact_fee_per_unit,
    living_stories,
    fu_per_unit: mixFixtureUnits(unit_type),
  });
  const soft_cost = soft.total;

  // 6. FINANCE
  const construct_cost = hard_cost + soft_cost;
  const hard_with_contingency = hard_cost * FINANCING.contingency;
  const dev_cost = hard_with_contingency + soft_cost;
  const amount_to_finance = dev_cost;
  // financing runs in two passes for RLV vs ROC & etc
  // RLV doesn't include land, the rest do
  const financeAt = (land_in_base: number, loan_principal: number) => {
    const base = amount_to_finance + land_in_base;
    const loan_fee = loan_principal * FINANCING.loan_fee;
    // the loan fee is due at closing and paid in equity
    const equity_amount = Math.max(0, base + loan_fee - loan_principal);

    // predev is drawn from the equity left after the land purchase
    const predev = calcPredevEquity(
      construct_cost,
      permitting_months,
      equity_amount - land_in_base
    );

    const constInt = calcConstructionInterest(
      loan_principal,
      const_months,
      construction_rate
    );
    const leaseup = calcLeaseupCarry(
      constInt.final_principal,
      rental_units,
      sale_units,
      construction_rate,
      leaseup_override
    );

    const total_financing_cost =
      loan_fee + constInt.total_interest + leaseup.carry_interest;
    return {
      loan_principal,
      equity_amount,
      loan_fee,
      predev,
      constInt,
      leaseup,
      total_financing_cost,
    };
  };
  const land_cost_total = land_cost * lot_sqft;
  const ltc_pass = financeAt(0, amount_to_finance * (1 - equity));
  const total_carry_months = ltc_pass.leaseup.total_carry_months;
  const total_months = permitting_months + const_months + total_carry_months;
  const project_years = total_months / 12;

  // 7. REVENUE (h201_rental + h201_sale)
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

  const parking_income = calcParkingIncome(env.stalls);
  const admin_income =
    max_units * 0.3 * INCOME.application_fee +
    max_units * 0.7 * INCOME.lease_renewal;
  const pgi = pri + parking_income + admin_income;
  const vacancy_loss = pgi * VACANCY.rental;

  const retail_pgi = include_retail
    ? net_commercial_sqft * retail_rent * 12 * mkt_rent_multiplier
    : 0;
  const retail_vacancy_loss = retail_pgi * VACANCY.default;

  const residential_egi = pgi - vacancy_loss;
  const retail_egi = retail_pgi - retail_vacancy_loss;
  const egi = residential_egi + retail_egi;

  // 8/26/26, for-sale units are discarded, 100% rental
  const afd_sales = 0;
  const mkt_sales = 0;
  const gross_sales = 0;

  // 8. OPEX + NOI + GDV
  const residential_opex = residential_egi * opex_ratio;
  const retail_opex = retail_egi * opex_ratio;
  const operating_expenses = residential_opex + retail_opex;

  // NOI is after property tax (201H: full tax from year 1, no exemption)
  const property_tax = calcPropertyTax(land_cost * lot_sqft, hard_cost);
  const tax = allocatePropertyTax(property_tax, residential_egi, retail_egi);
  const residential_noi =
    residential_egi - residential_opex - tax.residential_tax;
  const retail_noi = retail_egi - retail_opex - tax.retail_tax;
  const noi = residential_noi + retail_noi;

  const cap_rate = resolveCapRate(zone_class, sliders.cap_rate);

  const rental_gdv = residential_noi / cap_rate;
  let retail_gdv_val = 0;
  if (retail_egi > 0) {
    const retail_cap_rate = cap_rate + RETAIL_CAP_SPREAD;
    retail_gdv_val = retail_noi / retail_cap_rate;
  }
  const gdv = rental_gdv + retail_gdv_val + gross_sales;

  // 8b. LOAN SIZING
  // size the construction loan to the DSCR take-out
  // the hold period takes in DSCR while flip period ignores it
  const take_out =
    hold_years > 0
      ? calcDscrMaxLoan(noi, permanent_rate, amort_years, min_dscr)
      : null;
  // two loans, one for each framework the card reports
  // loan A (RLV basis): sized on construction cost only
  // loan B (deal basis): sized on construction cost plus land
  // where the DSCR binds the two coincide; they differ only when LTC is binding
  const rlv_sizing = sizeConstructionLoan(
    amount_to_finance,
    equity,
    ltc_pass.leaseup.final_principal,
    take_out
  );
  const rlv_financing_cost = (
    rlv_sizing.dscr_binds ? financeAt(0, rlv_sizing.loan_principal) : ltc_pass
  ).total_financing_cost;

  const deal_base = amount_to_finance + land_cost_total;
  const deal_ltc = financeAt(land_cost_total, deal_base * (1 - equity));
  const sizing = sizeConstructionLoan(
    deal_base,
    equity,
    deal_ltc.leaseup.final_principal,
    take_out
  );
  const {
    equity_amount,
    loan_principal,
    loan_fee,
    predev,
    constInt,
    leaseup,
    total_financing_cost,
  } = sizing.dscr_binds
    ? financeAt(land_cost_total, sizing.loan_principal)
    : deal_ltc;

  // 9. DEVELOPER RLV
  const rlv_base = calcDevRLV(
    gdv,
    dev_cost,
    rlv_financing_cost,
    0, // no per-unit grant
    "none", // no grant type
    lot_sqft,
    total_months,
    sliders.target_return ?? DEFAULT_TARGET_RETURN,
    sliders.profit_margin ?? DEFAULT_PROFIT_MARGIN
  );

  const rlv = {
    ...rlv_base,
    post_construction_grant: 0,
    rlv: rlv_base.rlv,
    rlv_sqft: Math.round((rlv_base.rlv / lot_sqft) * 100) / 100,
  };

  // 11. DEVELOPER FEASIBILITY
  // the deal loan's base includes land, so equity_amount already carries the
  // developer's share of the land purchase
  const total_equity_invested = equity_amount;
  const total_dev_cost_full = dev_cost + land_cost_total + total_financing_cost;
  const yr1_prop_tax =
    (land_cost_total + hard_cost) * FINANCING.rpt_residential;

  let dev: Partial<ParcelOutput>;

  if (hold_years === 0) {
    //  DEV FLIP
    const selling_costs = gdv * FINANCING.disposition_cost;
    const equity_out = gdv - selling_costs - leaseup.final_principal;
    const cashflows = new Array(total_months + 1).fill(0);
    // equity first: land, then predev, then the balance at loan closing
    equityFirstDraws(
      equity_amount,
      land_cost_total,
      predev.monthly_predev_spend,
      permitting_months
    ).forEach((d, m) => {
      cashflows[m] += d;
    });
    cashflows[total_months] = equity_out;

    const levered_irr = solveIRR(cashflows, true);
    const equity_multiple = equity_out / total_equity_invested;
    const roi = (equity_out - total_equity_invested) / total_equity_invested;
    const profit = gdv - selling_costs - total_dev_cost_full;
    const roc = noi / total_dev_cost_full;

    dev = {
      dev_strategy: "dev_flip",
      dev_hold_years: 0,
      dev_post_grant: 0,
      dev_land_cost: land_cost_total,
      dev_total_dev_cost: Math.round(total_dev_cost_full),
      dev_capital_subsidy: 0,
      dev_net_dev_cost: Math.round(total_dev_cost_full),
      dev_levered_irr: Math.round(levered_irr * 10000) / 10000,
      dev_equity_multiple: Math.round(equity_multiple * 100) / 100,
      dev_profit: Math.round(profit),
      dev_roi: Math.round(roi * 10000) / 10000,
      dev_roc: Math.round(roc * 10000) / 10000,
      dev_gdv: Math.round(gdv),
      dev_selling_costs: Math.round(selling_costs),
      dev_equity_out: Math.round(equity_out),
      dev_loan_payoff: Math.round(leaseup.final_principal),
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
  } else {
    // HOLD STRATEGY
    const land_value = land_cost_total;
    const improvement_value = hard_cost;
    const tax_rate = FINANCING.rpt_residential;

    // Sale proceeds pay down construction loan first
    const sale_selling_costs = gross_sales * FINANCING.disposition_cost;
    const net_sale_proceeds = gross_sales - sale_selling_costs;
    const perm_loan_balance = Math.max(
      0,
      leaseup.final_principal - net_sale_proceeds
    );
    const excess_sale_cash = Math.max(
      0,
      net_sale_proceeds - leaseup.final_principal
    );

    // 201H: full tax from year 1, no exemption
    const yr1_noi_after_tax = egi - operating_expenses - yr1_prop_tax;

    const perm = calcPermanentLoan(
      perm_loan_balance,
      yr1_noi_after_tax,
      permanent_rate,
      hold_years,
      amort_years,
      min_dscr
    );

    const dscr_display = perm_loan_balance === 0 ? null : perm.dscr;
    const is_bankable_display =
      perm_loan_balance === 0 ? null : perm.is_bankable;

    const entry_cap = cap_rate;
    const exit_cap = entry_cap + HOLD.exit_cap_spread;

    const hold_months = hold_years * 12;
    const total_with_hold = total_months + hold_months;
    const cf = new Array(total_with_hold + 1).fill(0);
    cf[0] = -equity_amount;
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
      // 201H: full property tax every year, no exemption
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
    const roc = noi / total_dev_cost_full;

    dev = {
      dev_strategy: "hold",
      dev_hold_years: hold_years,
      dev_post_grant: 0,
      dev_land_cost: land_cost_total,
      dev_total_dev_cost: Math.round(total_dev_cost_full),
      dev_capital_subsidy: 0,
      dev_net_dev_cost: Math.round(total_dev_cost_full),
      dev_levered_irr: Math.round(annual_irr * 10000) / 10000,
      dev_equity_multiple: Math.round(equity_multiple * 100) / 100,
      dev_profit: Math.round(profit),
      dev_roi: Math.round(roi * 10000) / 10000,
      dev_roc: Math.round(roc * 10000) / 10000,
      dev_gdv: Math.round(gdv),
      dev_selling_costs: Math.round(stored_selling_costs),
      dev_equity_out: Math.round(total_cash_in),
      dev_loan_payoff: perm.remaining_bal,
      dev_dscr: dscr_display,
      dev_is_bankable: is_bankable_display,
      dev_annual_debt_svc:
        perm_loan_balance === 0 ? null : perm.annual_debt_svc,
      dev_perm_principal: perm_loan_balance === 0 ? null : perm.perm_principal,
      dev_perm_rate: perm_loan_balance === 0 ? null : permanent_rate,
      dev_cash_on_cash: Math.round(cash_on_cash * 10000) / 10000,
      dev_entry_cap: Math.round(entry_cap * 10000) / 10000,
      dev_exit_cap: Math.round(exit_cap * 10000) / 10000,
      dev_yr1_prop_tax: Math.round(yr1_prop_tax),
      dev_equity_invested: total_equity_invested,
    };
  }

  // calculate ROC and target spread for output with user inputs
  const _roc = dev.dev_roc ?? 0;
  const _entry_cap = cap_rate;
  const _target_spread = sliders.target_spread ?? DEFAULT_TARGET_SPREAD;
  const _investment_spread = _roc - _entry_cap;
  const _target_roc = _entry_cap + _target_spread;

  // ASSEMBLE OUTPUT
  return {
    tmk: "hypothetical",
    zone_class,
    lot_sqft,
    height_limit,
    buildable_sqft,
    net_residential_sqft,
    net_commercial_sqft,
    max_units,
    parking_stalls: env.stalls,
    podium_levels: env.podium_levels,
    parking_sqft: env.parking_sqft,
    parking_share: env.parking_share,
    affordable_units,
    afd_rent_units,
    mkt_rent_units,
    afd_sale_units,
    mkt_sale_units,
    hard_cost: Math.round(hard_cost),
    soft_cost: Math.round(soft_cost),
    dev_cost: Math.round(dev_cost),
    total_financing_cost: Math.round(total_financing_cost),
    rlv_financing_cost: Math.round(rlv_financing_cost),
    pre_construction_subsidy: 0,
    equity_amount: Math.round(equity_amount),
    dev_equity_pct_realized: sizing.equity_pct_realized,
    dev_dscr_binds: sizing.dscr_binds,
    loan_balance_at_stab: Math.round(leaseup.final_principal),
    total_predev_cost: predev.total_predev_cost,
    construction_equity: predev.construction_equity,
    permitting_months,
    const_months,
    leaseup_months: leaseup.leaseup_months,
    sales_months: leaseup.sales_months,
    total_carry_months: leaseup.total_carry_months,
    total_months,
    project_years,
    pri: Math.round(pri),
    pgi: Math.round(pgi),
    residential_egi: Math.round(residential_egi),
    retail_pgi: Math.round(retail_pgi),
    retail_egi: Math.round(retail_egi),
    egi: Math.round(egi),
    gross_sales: Math.round(gross_sales),
    afd_sales: Math.round(afd_sales),
    mkt_sales: Math.round(mkt_sales),
    residential_opex: Math.round(residential_opex),
    retail_opex: Math.round(retail_opex),
    operating_expenses: Math.round(operating_expenses),
    property_tax: Math.round(property_tax),
    noi: Math.round(noi),
    cap_rate,
    gdv: Math.round(gdv),
    rlv_selling_costs: rlv.selling_costs,
    rlv_post_grant: 0,
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
