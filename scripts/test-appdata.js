// teste manual: node scripts/test-appdata.js 2026-08-20
require('dotenv').config();
const a = require('../lib/appdata');
(async () => {
  const day = process.argv[2];
  console.log(await a.dayTotals(day));
  const h = await a.dayHourly(day); console.log(h.filter(x => x.visitors || x.sales).slice(0, 3));
  console.log(await a.dayAttrib(day));
  console.log(await a.cohort(day, day));
  process.exit(0);
})();
