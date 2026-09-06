const fs = require("fs")
const path = require("path")
const { Client } = require("pg")

async function run() {
  const password = process.env.SUPABASE_DB_PASSWORD || process.argv[2]
  if (!password) {
    console.error("Usage: node scripts/execute_migration.js <DATABASE_PASSWORD>")
    process.exit(1)
  }

  const projectRef = "wngcxtcufszlzpbtvauu"
  const hosts = [
    `aws-0-ap-south-1.pooler.supabase.com`,
    `aws-0-us-east-1.pooler.supabase.com`,
    `db.${projectRef}.supabase.co`,
  ]

  const sqlPath = path.join(__dirname, "setup_complete_database.sql")
  const sql = fs.readFileSync(sqlPath, "utf-8")

  let connected = false
  for (const host of hosts) {
    const isPooler = host.includes("pooler.supabase.com")
    const port = isPooler ? 6543 : 5432
    const user = isPooler ? `postgres.${projectRef}` : "postgres"

    console.log(`Connecting to ${host}:${port} as ${user}...`)
    const client = new Client({
      host,
      port,
      user,
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })

    try {
      await client.connect()
      console.log(` Connected to PostgreSQL at ${host}!`)
      console.log("Executing setup_complete_database.sql...")
      await client.query(sql)
      console.log(" Migration executed successfully! All tables, policies, and triggers created.")
      await client.end()
      connected = true
      break
    } catch (err) {
      console.warn(`Could not connect via ${host}: ${err.message}`)
      try { await client.end() } catch (e) {}
    }
  }

  if (!connected) {
    console.error("All connection attempts failed. Please verify the database password.")
    process.exit(1)
  }
}

run()
