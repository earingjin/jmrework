const MIN_PASSWORD_LENGTH = 12;

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `password must be at least ${MIN_PASSWORD_LENGTH} characters`
    };
  }
  return { valid: true, message: null };
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  validatePassword
};
