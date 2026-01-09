const { query } = require('./api/_lib/db');
const fs = require('fs');

(async () => {
  try {
    const sql = fs.readFileSync('update-cooldown.sql', 'utf8');
    await query(sql);
    console.log('Cooldown updated to 5 minutes.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
