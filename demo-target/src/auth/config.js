// Auth configuration — DO NOT COMMIT
// This file intentionally contains security issues for gitrails demo

const ENV = process.env.NODE_ENV || 'development';

// ⚠️  OWASP A07 — Hardcoded credentials (intentionally fake — demo only)
const AWS_ACCESS_KEY = "DEMO-AWS-ACCESS-KEY-ID";
const AWS_SECRET_KEY = "DEMO-AWS-SECRET-KEY-NOT-REAL";

// ⚠️  OWASP A02 — Weak cryptography
const DB_PASSWORD = "admin123";
const JWT_SECRET = "supersecret";

// ⚠️  OWASP A05 — Debug mode left on in production config
const config = {
  debug: true,
  aws: {
    accessKey: AWS_ACCESS_KEY,
    secretKey: AWS_SECRET_KEY,
    region: "us-east-1",
  },
  db: {
    host: "prod-db.internal",
    port: 5432,
    password: DB_PASSWORD,
    ssl: false, // ⚠️  SSL disabled
  },
  jwt: {
    secret: JWT_SECRET,
    // ⚠️  Math.random used for token generation — not cryptographically secure
    generateToken: () => Math.random().toString(36).substring(2),
    expiresIn: "24h",
  },
  cors: {
    origin: "*", // ⚠️  CORS wildcard — OWASP A05
    credentials: true,
  },
};

module.exports = config;
