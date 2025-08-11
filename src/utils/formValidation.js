// src/utils/formValidation.js

// Helpers
const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

// 1) Common cross-form validation (required + number type)
export function validateCommon(fields, formData) {
  const errors = {};

  fields.forEach((field) => {
    const { key, label, isRequired, dataType } = field;
    const value = formData[key];

    // Required
    const required = (isRequired === true) || (String(isRequired).toLowerCase() === 'true');
    if (required && (value === '' || value === null || value === undefined)) {
      errors[key] = `${label || key} is required`;
      return; // skip further checks for this field
    }

    // Number type check (only if value present)
    if (dataType === 'number' && value !== '' && value !== null && value !== undefined) {
      const n = toNum(value);
      if (Number.isNaN(n)) {
        errors[key] = `${label || key} must be a valid number`;
      }
    }

    // New validation check for positiveNumber
    if (dataType === 'positiveNumber' && value !== '' && value !== null && value !== undefined) {
      const n = toNum(value);
      if (Number.isNaN(n) || n < 0) {
        errors[key] = `${label || key} must be a positive number`;
      }
    }
  });

  return errors;
}

// 2) Module-specific validators
const moduleValidators = {
  productionLog: (data) => {
    const errs = {};
    const seedInput = toNum(data.seedInputKgs);
    const oil = toNum(data.unfilteredOilKgs);
    const cake = toNum(data.cakeKgs);

    // Only run if the three values are all valid numbers
    if (![seedInput, oil, cake].some(Number.isNaN)) {
    //   if (seedInput < 1.1*(oil + cake)) {
    //     errs.seedInputKgs = `Seed Input (kg) must be ≥ Unfiltered Oil (kg) + Cake (kg).`;
    //     // Optionally mark the other fields too:
    //     errs.unfilteredOilKgs ||= 'Check value';
    //     errs.cakeKgs ||= 'Check value';
    //   }
    }
    return errs;
  },

  // Add more module rules here:
  // cashLog: (data) => ({ ... })
};

// 3) Single entry point that merges common + module-specific
export function validateForm(module, fields, formData) {
  const errors = { ...validateCommon(fields, formData) };

  if (moduleValidators[module]) {
    const modErrs = moduleValidators[module](formData);
    Object.assign(errors, modErrs);
  }

  return errors;
}
