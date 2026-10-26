// Bill 7 (ROH Chapter 32) Calculator
// Key Bill 7 rules:
// - FAR=4, lot coverage=80% (ROH Chp 32)
// - 80% affordable rental, no sale units
// - Permit fees waived, park dedication waived, wastewater waived
// - grants: $12k post-construction per affordable unit ($40/sqft under 300
//   sqft), or a $50k pre-construction subsidy per unit with prevailing wages
// - 15-year property tax exemption on improvements
// - Height-based construction cost rate (not zone lookup)
// - excavation and stepbacks follow the zone; timing is 18/12 months unless set

import {
  allocatePropertyTax,
  calcConstructionInterest,
  calcDevRLV,
  calcDscrMaxLoan,
  calcLeaseupCarry,
  calcParkArea,
  calcParkingIncome,
  calcPermanentLoan,
  calcPredevEquity,
  calcPropertyTax,
  calcSoftCosts,
  COMMERCIAL_COVERAGE,
  commercialFracByZone,
  DEFAULT_PROFIT_MARGIN,
  DEFAULT_RETAIL_SHARE,
  DEFAULT_TARGET_RETURN,
  DEFAULT_TARGET_SPREAD,
  EFFICIENCY,
  envelopeCoverage,
  equityFirstDraws,
  excavationDepthByZone,
  FINANCING,
  floorPlates,
  GRANT,
  HOLD,
  PREVAILING_WAGE,
  INCOME,
  mixFixtureUnits,
  mixPostGrant,
  mixRentByAmi,
  mixUnitSize,
  ParcelOutput,
  DEFAULT_PERMITTING_MONTHS,
  podiumEnvelope,
  resolveCapRate,
  DEFAULT_CONST_MONTHS,
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
export const DEFAULT_RETAIL_RENT = 3;
export const DEFAULT_HEIGHT_LIMIT = 30;
export const DEFAULT_PERMANENT_RATE = 0.07;
export const DEFAULT_HOLD_YEARS = 10;
export const DEFAULT_LAND_COST = 130;
export const DEFAULT_GRANT_TYPE = "post_construct" as
  "none" | "pre_construct" | "post_construct";
export const DEFAULT_INCLUDE_RETAIL = false;
export const DEFAULT_AFFORDABLE_AMI = "ami_80";
export const DEFAULT_MARKET_AMI = "ami_100";

// =========================================================
// MAIN ENTRY: calcBill7Single
// =========================================================

export function calcBill7Single(sliders: SliderInputs): ParcelOutput {
  const lot_sqft = sliders.lot_sqft ?? 5000;
  const height_limit = sliders.height_limit ?? DEFAULT_HEIGHT_LIMIT;
  const unit_type = sliders.unit_type ?? "studio50_1br50";
  const equity = sliders.equity ?? 0.3;
  const land_cost = sliders.land_cost ?? DEFAULT_LAND_COST;
  const leaseup_override = sliders.leaseup_months;
  const permanent_rate = sliders.permanent_rate ?? DEFAULT_PERMANENT_RATE;
  const hold_years = sliders.hold_years ?? DEFAULT_HOLD_YEARS;
  const amort_years = sliders.amort_years ?? HOLD.amort_years;
  const min_dscr = sliders.min_dscr ?? 1.15;
  // GET-exempt affordable rental
  const opex_ratio = sliders.opex_ratio ?? 0.19;
  const grant_type = sliders.grant_type ?? DEFAULT_GRANT_TYPE;
  // per affordable unit; post-construction pays $40/sqft below 300 sqft
  const grant_amount =
    sliders.grant_amount ??
    (grant_type === "pre_construct"
      ? GRANT.pre_construct
      : mixPostGrant(unit_type));
  const include_retail = sliders.include_retail ?? false;
  const retail_rent = sliders.retail_rent ?? 3;
  const affordable_ami = sliders.affordable_ami ?? DEFAULT_AFFORDABLE_AMI;
  const market_ami = sliders.market_ami ?? DEFAULT_MARKET_AMI;
  const construction_rate =
    sliders.construction_rate ?? FINANCING.construction_rate;
  // bill 7 applies in A, AMX, BMX and waikiki districts; excavation and
  // stepbacks follow the zone, or the height without one
  const has_zone = sliders.zone_class != null;
  const zone_class =
    sliders.zone_class ?? (height_limit <= 30 ? "low_rise" : "mid_rise");
  const permitting_months_val =
    sliders.permitting_months ?? DEFAULT_PERMITTING_MONTHS;
  const hard_cost_per_sqft = sliders.hard_cost_per_sqft ?? 450;
  // Bill 7 projects are exempt from off-street parking (ROH 32-2.3)
  const parking_ratio = sliders.parking_ratio ?? 0;
  const retail_share = sliders.retail_share ?? DEFAULT_RETAIL_SHARE;
  const setback = sliders.setback ?? 10;
  const building_area_per_unit = sliders.building_area_per_unit ?? 800;
  const max_far = sliders.max_far ?? 4.0;
  const waivable_fee_basis = sliders.waivable_fee_basis ?? "none";
  // Bill 7 waives park dedication (ROH 43-10.8), so by default it costs
  // nothing. Choosing the in-lieu fee charges it as the other pathways do, to
  // show what the waiver is worth.
  const park = sliders.park === "in_lieu" ? "in_lieu" : "none";
  // bill 7's own 80% lot-coverage cap (ROH Chp 32); overridable for testing
  const coverage = sliders.coverage ?? 0.8;

  // =========================================================
  // Step 1: Hard costs
  // =========================================================
  const floors = Math.floor(height_limit / 10);
  // waikiki precincts must keep 35–50% of the lot open; that and the coverage
  // cap are both measured on the zoning lot, so the stricter one governs
  const far_cap = max_far * lot_sqft;
  // per-storey floor plates
  const plates = floorPlates({
    floors,
    floor_height: 10,
    height_limit,
    lot_sqft,
    coverage_plate: envelopeCoverage(zone_class, max_far, coverage) * lot_sqft,
    setback,
    stepback: stepBackOf(
      sliders,
      has_zone ? zoneStepBack(zone_class) : undefined
    ),
  });

  // ground-floor retail is only permitted where the base zone allows it
  const commercial_frac = !include_retail
    ? 0
    : sliders.zone_class
      ? commercialFracByZone(sliders.zone_class)
      : height_limit <= 30
        ? COMMERCIAL_COVERAGE.commercial1
        : COMMERCIAL_COVERAGE.commercial2;
  const unit_size = mixUnitSize(unit_type);
  const max_units_by_law = Math.floor(
    (lot_sqft * max_far) / building_area_per_unit
  );
  const env = podiumEnvelope({
    plates,
    far_cap,
    retail_cap: commercial_frac * lot_sqft,
    retail_share,
    unit_size,
    parking_ratio,
    max_units: max_units_by_law,
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

  if (max_units <= 0)
    return zeroOutput("hypothetical", zone_class, lot_sqft, height_limit);

  // Bill 7: 80% affordable rental, no sale
  const afd_rent_units = Math.ceil(max_units * 0.8);
  const mkt_rent_units = max_units - afd_rent_units;
  const afd_sale_units = 0;
  const mkt_sale_units = 0;
  const affordable_units = afd_rent_units;

  // Trey said to implement car parking for now (7/20/26)
  const parking_cost = env.parking_cost;
  const hard_cost_base = building_cost + parking_cost;

  // Resolve construction months early so cost inflation can use it.
  const const_months_val = sliders.const_months || DEFAULT_CONST_MONTHS;
  // Construction cost inflation: costs are spent throughout the build, so the average dollar lands at permitting + const/2.
  const cost_inflation_multiplier =
    FINANCING.cost_inflation **
    ((permitting_months_val + const_months_val / 2) / 12);
  // hard cost before any prevailing wage premium
  const open_shop_hard_cost = hard_cost_base * cost_inflation_multiplier;

  // post-construction pays per affordable unit, pre-construction per unit
  const post_construction_grant =
    grant_type === "post_construct" ? affordable_units * grant_amount : 0;
  const is_pre = grant_type === "pre_construct";
  // prevailing wage premium on on-site labor, pre-construction only
  const pw_premium = is_pre
    ? (sliders.prevailing_wage_premium ?? PREVAILING_WAGE.labor_premium)
    : 0;
  const onsite_labor =
    (sliders.onsite_labor_share ?? PREVAILING_WAGE.onsite_labor_share) *
    open_shop_hard_cost;
  const pw_premium_cost = onsite_labor * pw_premium;
  const hard_cost = open_shop_hard_cost + pw_premium_cost;
  // subsidy can only pay on-site prevailing wages (ROH 32-5.2(c)(3))
  const subsidy_labor_cap = onsite_labor + pw_premium_cost;
  const subsidy_units =
    sliders.grant_units === "affordable" ? affordable_units : max_units;
  const subsidy_requested = is_pre ? subsidy_units * grant_amount : 0;
  const pre_construction_subsidy = Math.min(
    subsidy_requested,
    subsidy_labor_cap
  );

  // =========================================================
  // Step 2: Soft costs
  // =========================================================
  const living_stories = env.living_stories;
  const soft = calcSoftCosts({
    hard_cost,
    lot_sqft,
    max_units,
    affordable_units,
    excavation_depth: has_zone
      ? excavationDepthByZone(zone_class)
      : height_limit <= 30
        ? 3
        : 5,
    park,
    // Park land is charged on market units only; §22-7.3(j)(1) exempts
    // affordable units, same rule as the other pathways.
    park_area:
      park === "in_lieu"
        ? calcParkArea(max_units - affordable_units, buildable_sqft)
        : 0,
    land_cost_per_sqft: land_cost,
    waivable_fee_basis,
    impact_fee_per_unit: 0,
    living_stories,
    fu_per_unit: mixFixtureUnits(unit_type),
  });
  const soft_cost = soft.total;

  // =========================================================
  // Step 3: Financing
  // =========================================================
  const construct_cost = hard_cost + soft_cost;

  // the loan is sized on full cost
  const hard_cost_contingency = hard_cost * FINANCING.contingency;
  const total_dev_cost = hard_cost_contingency + soft_cost;
  // equity = cost + loan fee - loan; grants come after closing
  const amount_to_finance = total_dev_cost;
  const land_cost_total = land_cost * lot_sqft;
  // financing runs in two passes for RLV vs ROC & etc
  // RLV doesn't include land, the rest do
  const financeAt = (land_in_base: number, loan_principal: number) => {
    const base = amount_to_finance + land_in_base;
    const loan_fee = loan_principal * FINANCING.loan_fee;
    // the loan fee is due at closing and paid in equity
    const equity_amount = Math.max(0, base + loan_fee - loan_principal);

    // pre-dev equity (no compounding,IRR handles time cost)
    // drawn from the equity left after the land purchase
    const predev = calcPredevEquity(
      construct_cost,
      permitting_months_val,
      equity_amount - land_in_base
    );

    // construction interest
    const const_int = calcConstructionInterest(
      loan_principal,
      const_months_val,
      construction_rate
    );

    // lease-up carry
    const leaseup = calcLeaseupCarry(
      const_int.final_principal,
      afd_rent_units + mkt_rent_units,
      0,
      construction_rate,
      leaseup_override
    );

    // total financing cost = real debt costs only (no predev carry)
    const total_financing_cost =
      loan_fee + const_int.total_interest + leaseup.carry_interest;
    return {
      loan_principal,
      equity_amount,
      loan_fee,
      predev,
      const_int,
      leaseup,
      total_financing_cost,
    };
  };
  const ltc_pass = financeAt(0, amount_to_finance * (1 - equity));
  const total_carry_months = ltc_pass.leaseup.total_carry_months;
  const total_months =
    permitting_months_val + const_months_val + total_carry_months;

  // grant cash by month: pre-construction evenly over construction
  // (ROH 32-5.2(8)), post-construction when construction ends (32-4.2(c))
  const construction_end = permitting_months_val + const_months_val;
  const grant_flows: number[] = new Array(total_months + 1).fill(0);
  for (let m = permitting_months_val + 1; m <= construction_end; m++)
    grant_flows[m] += pre_construction_subsidy / const_months_val;
  grant_flows[construction_end] += post_construction_grant;
  const total_grants = pre_construction_subsidy + post_construction_grant;

  // =========================================================
  // Step 4: Revenue
  // =========================================================
  // affordable rent caps reset with each year's hud limits (roh 32-1.1 uses
  // the current ami), so they escalate over permitting like market rents
  const afd_rent_multiplier =
    FINANCING.ami_escalation **
    ((permitting_months_val + const_months_val + total_carry_months) / 12);
  const mkt_rent_multiplier =
    FINANCING.ami_escalation **
    ((permitting_months_val + const_months_val + total_carry_months) / 12);

  const affordable_rent =
    mixRentByAmi(affordable_ami, unit_type) * afd_rent_multiplier;
  const market_rent = mixRentByAmi(market_ami, unit_type) * mkt_rent_multiplier;
  const pri =
    affordable_rent * afd_rent_units * 12 + market_rent * mkt_rent_units * 12;

  // Trey said to implement car parking for now (7/20/26)
  const parking_income = calcParkingIncome(env.stalls);
  const admin_income =
    max_units * 0.3 * INCOME.application_fee +
    max_units * 0.7 * INCOME.lease_renewal;
  const pgi = pri + parking_income + admin_income;
  const vacancy_loss = pgi * VACANCY.rental;
  const residential_egi = pgi - vacancy_loss;

  let retail_pgi = 0;
  let retail_egi = 0;
  if (include_retail && net_commercial_sqft > 0) {
    retail_pgi = net_commercial_sqft * retail_rent * 12 * mkt_rent_multiplier;
    retail_egi = retail_pgi * (1 - VACANCY.default);
  }
  const egi = residential_egi + retail_egi;

  // =========================================================
  // Step 5: Opex
  // =========================================================
  const residential_opex = residential_egi * opex_ratio;
  const retail_opex = retail_egi * opex_ratio;
  const operating_expenses = residential_opex + retail_opex;

  // =========================================================
  // Step 6: NOI & GDV (gross, no disposition cost baked in)
  // =========================================================
  const cap_rate = resolveCapRate(sliders.cap_rate);
  // NOI is after property tax (bill 7: improvements exempt, land-only tax)
  // bill 7's 15yr improvement exemption applies only while the affordable rent is 80% AMI or less
  const tax_exempt = Number(String(affordable_ami).replace("ami_", "")) <= 80;
  // taxed on hard cost without the wage premium
  const property_tax = calcPropertyTax(
    land_cost * lot_sqft,
    open_shop_hard_cost,
    tax_exempt
  );
  const tax = allocatePropertyTax(property_tax, residential_egi, retail_egi);
  const residential_noi =
    residential_egi - residential_opex - tax.residential_tax;
  const retail_noi = retail_egi - retail_opex - tax.retail_tax;
  const noi = residential_noi + retail_noi;

  // GDV is gross capitalized value (NOI / cap rate)
  // disposition cost is applied at point of sale only, not here
  const rental_gdv = residential_noi / cap_rate;
  let retail_gdv_val = 0;
  if (include_retail && retail_egi > 0) {
    const retail_cap_rate = cap_rate + RETAIL_CAP_SPREAD;
    retail_gdv_val = retail_noi / retail_cap_rate;
  }
  const gdv = rental_gdv + retail_gdv_val;

  const project_years =
    (permitting_months_val + const_months_val + total_carry_months) / 12;

  // =========================================================
  // Step 6b: size the construction loan to the DSCR take-out
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
    const_int,
    leaseup,
    total_financing_cost,
  } = sizing.dscr_binds
    ? financeAt(land_cost_total, sizing.loan_principal)
    : deal_ltc;

  // =========================================================
  // Step 7: Developer RLV
  // =========================================================
  const target_return = sliders.target_return ?? DEFAULT_TARGET_RETURN;

  const rlv = calcDevRLV(
    gdv,
    total_dev_cost,
    rlv_financing_cost,
    grant_flows,
    lot_sqft,
    total_months,
    target_return,
    sliders.profit_margin ?? DEFAULT_PROFIT_MARGIN
  );
  // =========================================================
  // Step 8: Developer Feasibility
  // =========================================================
  // the deal loan's base includes land, so equity_amount already carries the
  // developer's share of the land purchase
  const total_equity_invested = equity_amount;
  let dev: Partial<ParcelOutput>;

  if (hold_years === 0) {
    // DEV FLIP
    const selling_costs = gdv * FINANCING.disposition_cost;
    const post_grant = post_construction_grant;
    const equity_out = gdv - selling_costs - leaseup.final_principal;

    // monthly cashflow: equity draws, grants as paid, exit at end
    const cashflows = new Array(total_months + 1).fill(0);
    // equity first: land, then predev, then the balance at loan closing
    equityFirstDraws(
      equity_amount,
      land_cost_total,
      predev.monthly_predev_spend,
      permitting_months_val
    ).forEach((d, m) => {
      cashflows[m] += d;
    });
    grant_flows.forEach((g, m) => {
      cashflows[m] += g;
    });
    cashflows[total_months] += equity_out;

    const levered_irr = solveIRR(cashflows, true);
    const cash_in = equity_out + total_grants;
    const equity_multiple = cash_in / total_equity_invested;
    const roi = (cash_in - total_equity_invested) / total_equity_invested;

    const total_dev_cost_full =
      total_dev_cost + land_cost_total + total_financing_cost;
    // grants count as developer cash
    const profit =
      gdv -
      selling_costs -
      total_dev_cost_full +
      post_grant +
      pre_construction_subsidy;
    // return on cost is measured on the capital the developer has to put into the project
    const capital_subsidy = post_grant + pre_construction_subsidy;
    const net_dev_cost = total_dev_cost_full - capital_subsidy;
    const roc = noi / net_dev_cost;

    dev = {
      dev_strategy: "dev_flip",
      dev_hold_years: 0,
      dev_post_grant: post_grant,
      dev_land_cost: land_cost_total,
      dev_total_dev_cost: total_dev_cost_full,
      dev_capital_subsidy: Math.round(capital_subsidy),
      dev_net_dev_cost: Math.round(net_dev_cost),
      dev_levered_irr: Math.round(levered_irr * 10000) / 10000,
      dev_equity_multiple: Math.round(equity_multiple * 100) / 100,
      dev_profit: Math.round(profit),
      dev_roi: Math.round(roi * 10000) / 10000,
      dev_roc: Math.round(roc * 10000) / 10000,
      dev_gdv: gdv,
      dev_selling_costs: Math.round(selling_costs),
      dev_equity_out: Math.round(cash_in),
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
    const post_grant = post_construction_grant;

    const land_value = land_cost * lot_sqft;
    const improvement_value = open_shop_hard_cost;
    const tax_rate = FINANCING.rpt_residential;
    // yr1: land only (exemption)
    const yr1_prop_tax = tax_exempt
      ? land_value * tax_rate
      : (land_value + improvement_value) * tax_rate;
    const yr1_noi_after_tax = egi - operating_expenses - yr1_prop_tax;

    const perm = calcPermanentLoan(
      leaseup.final_principal,
      yr1_noi_after_tax,
      permanent_rate,
      hold_years,
      amort_years,
      min_dscr
    );

    const entry_cap = cap_rate;
    const exit_cap = entry_cap + HOLD.exit_cap_spread;

    const hold_months = hold_years * 12;
    const total_with_hold = total_months + hold_months;
    const cf = new Array(total_with_hold + 1).fill(0);
    // equity drawn as in the flip: land, predev, rest at closing
    equityFirstDraws(
      equity_amount,
      land_cost_total,
      predev.monthly_predev_spend,
      permitting_months_val
    ).forEach((d, m) => {
      cf[m] += d;
    });
    grant_flows.forEach((g, m) => {
      cf[m] += g;
    });

    let current_egi = egi;
    let current_opex = operating_expenses;
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
      // Bill 7: 15-year exemption on improvements
      const prop_tax =
        tax_exempt && yr <= HOLD.tax_exemption_years
          ? land_value * tax_rate
          : assessed_value * tax_rate;

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

    // after declaring total_equity_invested above
    const equity_multiple = total_cash_in / total_equity_invested;
    const roi = (total_cash_in - total_equity_invested) / total_equity_invested;
    const profit = total_cash_in - total_equity_invested;
    const yr1_levered_cf = yr1_noi_after_tax - perm.annual_debt_svc;
    const cash_on_cash = yr1_levered_cf / total_equity_invested;
    const total_dev_cost_full =
      total_dev_cost + land_cost_total + total_financing_cost;
    const capital_subsidy = post_grant + pre_construction_subsidy;
    const net_dev_cost = total_dev_cost_full - capital_subsidy;
    const roc = noi / net_dev_cost;

    dev = {
      dev_strategy: "hold",
      dev_hold_years: hold_years,
      dev_post_grant: post_grant,
      dev_land_cost: land_cost_total,
      dev_total_dev_cost: total_dev_cost_full,
      dev_capital_subsidy: Math.round(capital_subsidy),
      dev_net_dev_cost: Math.round(net_dev_cost),
      dev_levered_irr: Math.round(annual_irr * 10000) / 10000,
      dev_equity_multiple: Math.round(equity_multiple * 100) / 100,
      dev_profit: Math.round(profit),
      dev_roi: Math.round(roi * 10000) / 10000,
      dev_roc: Math.round(roc * 10000) / 10000,
      dev_gdv: gdv,
      dev_selling_costs: Math.round(stored_selling_costs),
      dev_equity_out: Math.round(total_cash_in),
      dev_loan_payoff: perm.remaining_bal,
      dev_perm_principal: perm.perm_principal,
      dev_perm_rate: permanent_rate,
      dev_annual_debt_svc: perm.annual_debt_svc,
      dev_dscr: perm.dscr,
      dev_is_bankable: perm.is_bankable,
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
    hard_cost,
    soft_cost,
    soft_cost_breakdown: soft,
    dev_cost: total_dev_cost,
    total_financing_cost,
    rlv_financing_cost,
    pre_construction_subsidy,
    pw_premium_cost,
    subsidy_labor_cap: is_pre ? subsidy_labor_cap : 0,
    subsidy_cap_binds: subsidy_requested > subsidy_labor_cap,
    equity_amount,
    dev_equity_pct_realized: sizing.equity_pct_realized,
    dev_dscr_binds: sizing.dscr_binds,
    loan_balance_at_stab: leaseup.final_principal,
    total_predev_cost: predev.total_predev_cost,
    construction_equity: predev.construction_equity,
    permitting_months: permitting_months_val,
    const_months: const_months_val,
    leaseup_months: leaseup.leaseup_months,
    sales_months: leaseup.sales_months,
    total_carry_months: leaseup.total_carry_months,
    total_months,
    project_years,
    pri,
    pgi,
    residential_egi,
    retail_pgi,
    retail_egi,
    egi,
    gross_sales: 0,
    afd_sales: 0,
    mkt_sales: 0,
    residential_opex,
    retail_opex,
    operating_expenses,
    property_tax,
    noi,
    cap_rate,
    gdv,
    // RLV
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
