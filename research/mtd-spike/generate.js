// THROWAWAY SPIKE — fake UK landlord bank transactions for one MTD quarter (6 Apr – 5 Jul 2026).
// Every name, amount and payee is invented. Deterministic (seeded) so the timing can be re-run.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const money = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
const months = ["2026-04", "2026-05", "2026-06"];
const day = (m, d) => `${m}-${String(d).padStart(2, "0")}`;

function landlordA() { // 1 flat, letting agent, dedicated account
  const t = [];
  for (const m of months) {
    t.push({ date: day(m, 3), payee: "HAART LETTINGS LTD RENT 12 ELM CT NET", amount: 1104.0 });
    t.push({ date: day(m, 1), payee: "NATWEST MORTGAGE DD", amount: -612.4 });
    t.push({ date: day(m, 15), payee: "MONTHLY ACCOUNT FEE", amount: -5.0 });
  }
  t.push({ date: "2026-04-20", payee: "DIRECT LINE LANDLORD INS", amount: -238.6 });
  t.push({ date: "2026-05-11", payee: "HAART LETTINGS LTD REPAIR INV 4471", amount: -145.0 });
  t.push({ date: "2026-06-02", payee: "GAS SAFE CERTS UK LTD", amount: -72.0 });
  return t;
}

function landlordB() { // 3 houses, self-managed, dedicated account, DIY repairs
  const t = [];
  const tenants = ["OPENRENT J SMITH RENT", "K PATEL RENT 4 OAK RD", "FPS M NOWAK 9 ASH ST"];
  for (const m of months) {
    tenants.forEach((p, i) => t.push({ date: day(m, 1 + i), payee: p, amount: [950, 1100, 875][i] }));
    t.push({ date: day(m, 5), payee: "SANTANDER BTL MORTGAGE", amount: -1420.15 });
    t.push({ date: day(m, 18), payee: "OCTOPUS ENERGY 9 ASH ST", amount: -money(60, 90) });
  }
  for (let i = 0; i < 6; i++) t.push({ date: day(pick(months), 1 + Math.floor(rnd() * 27)), payee: pick(["SCREWFIX DIRECT", "B&Q 1123 LEEDS", "TOOLSTATION", "AMAZON MARKETPLACE"]), amount: -money(8, 140) });
  t.push({ date: "2026-04-14", payee: "J SMITH PLUMBING & HEATING", amount: -260 });
  t.push({ date: "2026-05-07", payee: "SIMPLY BUSINESS LANDLORD", amount: -411.2 });
  t.push({ date: "2026-05-28", payee: "LEEDS CITY COUNCIL HMO LICENCE", amount: -890 });
  t.push({ date: "2026-06-09", payee: "TRANSFER TO 40021133", amount: -500 });
  t.push({ date: "2026-06-21", payee: "RIGHTMOVE / OPENRENT LISTING", amount: -59 });
  t.push({ date: "2026-06-25", payee: "DEPOSIT RETURN K PATEL", amount: -1100 });
  return t;
}

function landlordC() { // 2 flats through a personal current account
  const t = [];
  for (const m of months) {
    t.push({ date: day(m, 2), payee: "A KOWALSKI RENT FLAT 2", amount: 1250 });
    t.push({ date: day(m, 4), payee: "R O'BRIEN", amount: 1180 });
    t.push({ date: day(m, 1), payee: "HALIFAX MORTGAGE", amount: -1890.3 });
    t.push({ date: day(m, 25), payee: "SALARY ACME CONSULTING LTD", amount: 3820 });
    t.push({ date: day(m, 6), payee: "COUNCIL TAX DD", amount: -164 });
    t.push({ date: day(m, 9), payee: "NETFLIX.COM", amount: -12.99 });
    t.push({ date: day(m, 12), payee: "VODAFONE", amount: -38 });
  }
  for (let i = 0; i < 40; i++) t.push({ date: day(pick(months), 1 + Math.floor(rnd() * 27)), payee: pick(["TESCO STORES", "SAINSBURYS", "PRET A MANGER", "TFL TRAVEL", "UBER *TRIP", "DELIVEROO", "COSTA COFFEE"]), amount: -money(3, 85) });
  for (let i = 0; i < 6; i++) t.push({ date: day(pick(months), 1 + Math.floor(rnd() * 27)), payee: pick(["AMAZON MARKETPLACE", "IKEA LTD", "ARGOS", "B&Q 2210 CROYDON"]), amount: -money(15, 320) });
  t.push({ date: "2026-04-22", payee: "AVIVA INSURANCE", amount: -96.5 });
  t.push({ date: "2026-05-16", payee: "M DRAGAN", amount: -340 });
  t.push({ date: "2026-06-11", payee: "PAYPAL *CHECKATRADE", amount: -120 });
  t.push({ date: "2026-06-30", payee: "TRANSFER FROM SAVINGS", amount: 2000 });
  return t;
}

function landlordD() { // BLIND: payees the rules were not written for; 2 flats, own account
  const t = [];
  for (const m of months) {
    t.push({ date: day(m, 2), payee: "FOXTONS CLIENT A/C 31 KINGS RD", amount: 1610.0 });
    t.push({ date: day(m, 3), payee: "S AHMED", amount: 1050 });
    t.push({ date: day(m, 1), payee: "BARCLAYS PARTNER FIN", amount: -980.77 });
    t.push({ date: day(m, 1), payee: "TSB PLC DD 7781", amount: -655.1 });
  }
  t.push({ date: "2026-04-17", payee: "LV= LANDLORD COVER", amount: -301.4 });
  t.push({ date: "2026-04-29", payee: "WICKES BUILDING SUPPL", amount: -84.35 });
  t.push({ date: "2026-05-03", payee: "BRITISH GAS HOMECARE", amount: -21.5 });
  t.push({ date: "2026-05-19", payee: "SPARKS ELECTRICAL EICR", amount: -165 });
  t.push({ date: "2026-06-06", payee: "THAMES WATER", amount: -48.2 });
  t.push({ date: "2026-06-14", payee: "HOWDENS JOINERY", amount: -212.0 });
  t.push({ date: "2026-06-27", payee: "TDS DEPOSIT PROTECTION", amount: -28.8 });
  return t;
}

module.exports = {
  A: { label: "A — 1 flat via agent, own account", rows: landlordA() },
  B: { label: "B — 3 houses, self-managed, own account", rows: landlordB() },
  C: { label: "C — 2 flats through a personal account", rows: landlordC() },
  D: { label: "D — BLIND: 2 flats, payees the rules never saw", rows: landlordD() }
};
