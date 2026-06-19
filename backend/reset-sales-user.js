const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const p = new Pool({
  connectionString: "postgresql://postgres:TkdqEhjezTgMVdXclYOSIKWDjwChenqQ@acela.proxy.rlwy.net:13875/railway",
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const hash = await bcrypt.hash("memona@amc", 10);

    const existing = await p.query(
      "SELECT id FROM users WHERE email=$1",
      ["memona@amcsales.com"]
    );

    let r;

    if (existing.rows[0]) {
      r = await p.query(
        `UPDATE users
         SET name=$1, password=$2, role=$3, active=$4, sales_target=$5
         WHERE email=$6
         RETURNING id,name,email,role,active`,
        ["Memona Sales", hash, "sales", true, 50000, "memona@amcsales.com"]
      );
    } else {
      r = await p.query(
        `INSERT INTO users (name,email,password,role,phone,sales_target,active)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id,name,email,role,active`,
        ["Memona Sales", "memona@amcsales.com", hash, "sales", "", 50000, true]
      );
    }

    console.log("DONE:", r.rows);
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    await p.end();
  }
})();