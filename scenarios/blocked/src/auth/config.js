// Auth configuration — DEMO ONLY — DO NOT DEPLOY
// Intentional OWASP violations for gitrails showcase

// ⚠️  A07 — Hardcoded credentials (fake — demo only)
const AWS_ACCESS_KEY = "DEMO-AWS-ACCESS-KEY-ID";
const AWS_SECRET_KEY = "DEMO-AWS-SECRET-KEY-NOT-REAL";
const DB_PASSWORD    = "admin123";
const JWT_SECRET     = "supersecret";

// ⚠️  A05 — Debug mode, CORS wildcard
const config = {
  debug: true,
  aws: { accessKey: AWS_ACCESS_KEY, secretKey: AWS_SECRET_KEY, region: "us-east-1" },
  db:  { host: "prod-db.internal", port: 5432, password: DB_PASSWORD, ssl: false },
  jwt: {
    secret: JWT_SECRET,
    // ⚠️  A07 — Math.random for crypto tokens
    generateToken: () => Math.random().toString(36).substring(2),
    expiresIn: "24h",
  },
  cors: { origin: "*", credentials: true }, // ⚠️  A05 wildcard
};

module.exports = config;
