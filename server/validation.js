// Input validation helpers

const VALID_CATEGORIES = ['cleaning', 'cooking', 'shopping', 'repairs', 'garden', 'laundry', 'pets', 'finance', 'organization', 'errands', 'wellness', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['todo', 'in_progress', 'done', 'wont_do'];
const VALID_RECURRENCES = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];
const VALID_POINTS = [5, 10, 20, 50, 100];
const VALID_SORT_OPTIONS = ['due_date', 'priority', 'oldest', 'newest'];

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

function parseId(value) {
  const id = parseInt(value, 10);
  if (isNaN(id) || id < 1) return null;
  return id;
}

function sanitizeString(str, maxLength) {
  if (typeof str !== 'string') return null;
  return str.trim().slice(0, maxLength);
}

function validateUsername(username) {
  if (typeof username !== 'string') return null;
  const lower = username.toLowerCase().trim();
  if (!USERNAME_REGEX.test(lower)) return null;
  return lower;
}

function validatePassword(password) {
  if (typeof password !== 'string') return false;
  return password.length >= 6 && password.length <= 128;
}

module.exports = {
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  VALID_STATUSES,
  VALID_RECURRENCES,
  VALID_POINTS,
  VALID_SORT_OPTIONS,
  parseId,
  sanitizeString,
  validateUsername,
  validatePassword,
};
