// src/utils/formRules.js
export function evalCondition(cond, formData) {
  if (!cond) return true;

  const apply = (single) => {
    if (!single) return true;
    const { field, op = '=', value } = single;
    const left = formData?.[field];

    switch (op) {
      case '=':    return left === value;
      case '!=':   return left !== value;
      case '>':    return Number(left) > Number(value);
      case '<':    return Number(left) < Number(value);
      case '>=':   return Number(left) >= Number(value);
      case '<=':   return Number(left) <= Number(value);
      case 'in':   return Array.isArray(value) && value.includes(left);
      case 'notIn':return Array.isArray(value) && !value.includes(left);
      default:     return !!left; // fallback: truthy check
    }
  };

  if (cond.all) return cond.all.every(apply);
  if (cond.any) return cond.any.some(apply);
  // also support direct single object
  return apply(cond);
}

export function isVisible(field, formData) {
  return evalCondition(field.showWhen, formData);
}

/**
 * variantWhen:
 * {
 *   when:{...},
 *   then:{ inputType: 'dropdown', optionsFromField:'cashHandledBy' },
 *   else:{ inputType:'text' }
 * }
 */
export function applyVariant(field, formData, dropdownOptions) {
  const out = { ...field };
  const rule = field.variantWhen;
  if (!rule) return out;

  const matched = evalCondition(rule.when, formData);
  const pick = matched ? rule.then : rule.else;

  if (pick?.inputType) out.inputType = pick.inputType;

  // allow borrowing options from another field (by key)
  if (pick?.optionsFromField) {
    const sourceKey = pick.optionsFromField;
    out._injectedOptions = dropdownOptions?.[sourceKey] || [];
  }

  return out;
}

/**
 * derive: array of rules
 * ex: [{ when:{...}, setTo:{fromField:'qty'}, mode:'default' }]
 */
export function runDerive(field, formData, setFormData) {
  const rules = Array.isArray(field.derive) ? field.derive : [];
  let nextVal = formData[field.key];

  for (const r of rules) {
    if (!evalCondition(r.when, formData)) continue;

    // fromField copy
    if (r.setTo?.fromField) {
      const src = r.setTo.fromField;
      const v = formData[src];
      if (r.mode === 'default') {
        // set only if empty/undefined
        if (nextVal === '' || nextVal === undefined || nextVal === null) nextVal = v ?? '';
      } else {
        nextVal = v ?? '';
      }
    }

    // could add arithmetic here later if needed
  }

  if (nextVal !== formData[field.key]) {
    setFormData(prev => ({ ...prev, [field.key]: nextVal }));
  }
}

/**
 * lookup:
 * {
 *   when:{...},
 *   fromModule:'product',
 *   match:{ field:'skuId' },
 *   mapTo:'monoCarton',
 *   allowUserOverride:true
 * }
 */
export function shouldRunLookup(field, formData) {
  const lk = field.lookup;
  if (!lk) return false;
  return evalCondition(lk.when, formData);
}
