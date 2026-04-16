// Utility functions for string formatting and validation

/**
 * Truncates a string to maxLength and appends ellipsis if needed.
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum character length
 * @returns {string} Truncated string
 */
function truncate(str, maxLength) {
  if (typeof str !== "string") return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Checks if a string is a valid email address.
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formats a date as YYYY-MM-DD.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

module.exports = { truncate, isValidEmail, formatDate };
