/** Shared client-side validation helpers used alongside React Hook Form rules. */
export const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

export const isStrongPassword = (value) =>
  value.length >= 8 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

export const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.';

export const isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};
