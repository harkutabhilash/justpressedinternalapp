// src/DynamicFormRenderer.js
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import FormField from './components/FormField';
import Loader from './components/Loader';
import * as dateUtils from './utils/dateUtils';
import { validateForm } from './utils/formValidation';
import { callBackend, fetchAppModules } from './utils/moduleStructureAPI';
import { getOptionsFromModuleSource } from './utils/dropdownProvider';

function DynamicFormRenderer({ config, dropdowns, module }) {
  // ---- never return before hooks ----
  const isValidConfig = Array.isArray(config);

  // Derived lists (defensive fallback to [])
  const visibleFields = useMemo(
    () => (Array.isArray(config) ? config.filter(f => !!f.showInApp) : []),
    [config]
  );

  const groupedFields = useMemo(() => {
    const groups = {};
    for (const field of visibleFields) {
      const row = field.formRow || 0;
      if (!groups[row]) groups[row] = [];
      groups[row].push(field);
    }
    Object.keys(groups).forEach(rk => {
      groups[rk].sort(
        (a, b) => (Number(a.formColumn) || 0) - (Number(b.formColumn) || 0)
      );
    });
    return groups;
  }, [visibleFields]);

  const sortedRowKeys = useMemo(
    () => Object.keys(groupedFields).sort((a, b) => Number(a) - Number(b)),
    [groupedFields]
  );

  // Local state
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown state
  const [dropdownOptions, setDropdownOptions] = useState(dropdowns || {});

  useEffect(() => {
    setDropdownOptions(dropdowns || {});
  }, [dropdowns]);

  // Preload module-based dropdowns once per config change
  useEffect(() => {
    const sources = visibleFields
      .filter(f => f.inputType === 'dropdown' && f.dropdownSource && f.dropdownSource.includes('.'))
      .map(f => ({ key: f.key, src: f.dropdownSource }));

    sources.forEach(({ key, src }) => {
      const hasAny = Array.isArray(dropdownOptions[key]) && dropdownOptions[key].length > 0;
      if (hasAny) return;
      getOptionsFromModuleSource(src)
        .then(opts => setDropdownOptions(prev => ({ ...prev, [key]: opts || [] })))
        .catch(() => setDropdownOptions(prev => ({ ...prev, [key]: [] })));
    });
    // We intentionally only depend on visibleFields; dropdownOptions presence is checked per key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleFields]);

  // Initialize defaults whenever visible fields change
  useEffect(() => {
    const next = {};
    for (const field of visibleFields) {
      next[field.key] =
        field.dataType === 'date' ? new Date().toISOString().split('T')[0] : '';
    }
    setFormData(next);
    setErrors({});
  }, [visibleFields]);

  const handleChange = useCallback((key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleDropdownOpen = useCallback(
    (field) => {
      const key = field.key;
      const src = field?.dropdownSource || '';
      const hasAny = Array.isArray(dropdownOptions[key]) && dropdownOptions[key].length > 0;
      const looksLikeModuleSource = src.includes('.');

      if (hasAny || !looksLikeModuleSource) {
        return Promise.resolve(dropdownOptions[key] || []);
      }

      return getOptionsFromModuleSource(src)
        .then(opts => {
          setDropdownOptions(prev => ({ ...prev, [key]: opts || [] }));
          return opts || [];
        })
        .catch(e => {
          console.error(`Failed to fetch options for ${key} from ${src}`, e);
          setDropdownOptions(prev => ({ ...prev, [key]: [] }));
          return [];
        });
    },
    [dropdownOptions]
  );

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const newErrors = validateForm(module, visibleFields, formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const user = JSON.parse(sessionStorage.getItem('user'));
      const username = user?.username || 'Unknown';

      const enrichedData = { ...formData };
      for (const field of (Array.isArray(config) ? config : [])) {
        if (field.dataType === 'date' && enrichedData[field.key]) {
          enrichedData[field.key] = dateUtils.formatDateToDDMMMYYYY(enrichedData[field.key]);
        }
      }
      enrichedData.createdBy = username;
      enrichedData.modifiedBy = username;
      enrichedData.createdOn = dateUtils.getCurrentDateTime();
      enrichedData.modifiedOn = enrichedData.createdOn;

      let appModulesCache = JSON.parse(sessionStorage.getItem('appModulesCache'));
      if (!appModulesCache || !appModulesCache.data) {
        await fetchAppModules(true);
        appModulesCache = JSON.parse(sessionStorage.getItem('appModulesCache'));
      }
      const matched = appModulesCache?.data?.find(group =>
        group.modules.some(m => m.module === module)
      );
      const sheetId = matched?.modules.find(m => m.module === module)?.sheetId;
      if (!sheetId) {
        console.error(`❌ No sheetId found for module ${module}`);
        alert('Error: Unable to find sheetId for submission.');
        return;
      }

      console.log('📤 Payload being sent to backend:', {
        module, sheetId, tab: 'master', entry: enrichedData
      });

      await callBackend('saveLogEntry', { module, sheetId, tab: 'master', entry: enrichedData });

      alert('✅ Form submitted!');
      // reset
      const reset = {};
      for (const field of visibleFields) {
        reset[field.key] = field.dataType === 'date'
          ? new Date().toISOString().split('T')[0]
          : '';
      }
      setFormData(reset);
      setErrors({});
    } catch (err) {
      console.error('❌ Submission failed:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [config, formData, module, visibleFields]);

  // ---- render fallback AFTER hooks have been called ----
  if (!isValidConfig) {
    console.error('❌ Invalid config passed to DynamicFormRenderer:', config);
    return <div className="text-red-600">Unable to load form configuration.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="jp-form-area space-y-6" aria-busy={isSubmitting}>
      <div className="jp-form-header shadow-md">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="animate-spin h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent" />
              Submitting…
            </span>
          ) : 'Submit'}
        </button>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
          <Loader message="dataBeingSubmitted" />
        </div>
      )}

      <fieldset disabled={isSubmitting} className="space-y-6">
        {sortedRowKeys.map((rowKey) => (
          <div key={rowKey} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groupedFields[rowKey].map((field) => (
              <FormField
                key={field.key}
                field={field}
                value={formData[field.key] !== undefined ? formData[field.key] : ''}
                error={errors[field.key]}
                options={dropdownOptions[field.key] || []}
                onDropdownOpen={() => handleDropdownOpen(field)}
                onChange={(val) => handleChange(field.key, val)}
              />
            ))}
          </div>
        ))}
      </fieldset>
    </form>
  );
}

export default DynamicFormRenderer;
