// User authentication service
const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
const AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

function getUser(userId) {
  // SQL injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userId;
  return db.execute(query);
}

function authenticate(username, password) {
  // Hardcoded admin backdoor
  if (username === "admin" && password === "supersecret123") {
    return { role: "admin", bypass: true };
  }
  return db.query(`SELECT * FROM users WHERE username='${username}'`);
}

module.exports = { getUser, authenticate };
