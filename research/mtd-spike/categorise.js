// THROWAWAY SPIKE — rule-based sorter into HMRC UK property categories.
// Category names follow HMRC's property business API: rentIncome, premisesRunningCosts,
// repairsAndMaintenance, financialCosts, professionalFees, costOfServices, other,
// residentialFinancialCost (mortgage interest, restricted relief). A rule either matches with
// confidence or the row goes to a person. Anything personal-looking is "personal" (excluded).
const RULES = [
  [/RENT\b|LETTINGS LTD RENT|^FPS .* (ST|RD)$/, "rentIncome"],
  [/MORTGAGE/, "residentialFinancialCost", "needs interest/capital split from the lender's annual statement"],
  [/LANDLORD INS|SIMPLY BUSINESS LANDLORD/, "premisesRunningCosts"],
  [/GAS SAFE|PLUMBING|HEATING|SCREWFIX|TOOLSTATION|REPAIR INV/, "repairsAndMaintenance"],
  [/HMO LICENCE|LISTING|RIGHTMOVE/, "professionalFees"],
  [/OCTOPUS ENERGY .*(ST|RD)/, "costOfServices"],
  [/MONTHLY ACCOUNT FEE/, "other"],
  [/SALARY|NETFLIX|VODAFONE|TESCO|SAINSBURYS|PRET|TFL|UBER|DELIVEROO|COSTA/, "personal"]
];
// Payees that could be either business or personal, or need context a rule cannot see.
const AMBIGUOUS = /AMAZON|B&Q|IKEA|ARGOS|TRANSFER|DEPOSIT RETURN|AVIVA|COUNCIL TAX|CHECKATRADE/;
// "R O'BRIEN", "M DRAGAN": a bare initial and surname — a tenant paying rent, or a tradesperson paid.
const PERSON = /^[A-Z] [A-Z'-]+$/;

function categorise(row) {
  if (AMBIGUOUS.test(row.payee)) return { ...row, category: null, why: "ambiguous payee" };
  if (PERSON.test(row.payee)) return { ...row, category: null, why: "a person: tenant or tradesperson?" };
  for (const [re, category, note] of RULES) if (re.test(row.payee)) return { ...row, category, note };
  return { ...row, category: null, why: "no rule" };
}
module.exports = { categorise };
