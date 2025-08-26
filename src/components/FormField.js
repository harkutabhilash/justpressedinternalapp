// src/components/FormField.js
import React, { useEffect, useRef, useState } from "react";
import { Input } from "../packages/ui/input";
import { Label } from "../packages/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../packages/ui/select";

// tiny helper: accept TRUE/"TRUE"/true
const isTrue = (v) => String(v).toLowerCase() === "true";

export default function FormField({
  field,
  value,
  onChange,
  options = [],
  error,
  onDropdownOpen,
}) {
  const { key, label, placeholderText, inputType, dataType, isDisabled } = field;

  // lazy dropdown support (only fetch when user opens)
  const [localOptions, setLocalOptions] = useState(options || []);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(null);

  useEffect(() => setLocalOptions(options || []), [options]);

  const ensureOptions = async () => {
    if (localOptions.length > 0 || !onDropdownOpen || inFlight.current) return;
    setLoading(true);
    try {
      inFlight.current = onDropdownOpen();
      const fresh = await inFlight.current;
      setLocalOptions(Array.isArray(fresh) ? fresh : []);
    } finally {
      inFlight.current = null;
      setLoading(false);
    }
  };

  const commonLabel = (
    <Label className="text-[15px] font-medium text-gray-900">{label}</Label>
  );

  const disabled = isTrue(isDisabled);

  switch ((inputType || "").toLowerCase()) {
    case "dropdown":
      return (
        <div className="space-y-2">
          {commonLabel}
          <Select
            value={value}
            onValueChange={onChange}
            onOpenChange={(open) => open && ensureOptions()}
            disabled={disabled}
          >
            <SelectTrigger className="h-12 rounded-xl bg-[var(--input-background)] border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
              <SelectValue
                placeholder={
                  loading ? "Fetching options…" : placeholderText || `Select ${label}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {localOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-2">
          {commonLabel}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            disabled={disabled}
            className="w-full h-28 rounded-xl border-[var(--border)] bg-[var(--input-background)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            placeholder={placeholderText || label}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      );

    case "date":
      return (
        <div className="space-y-2">
          {commonLabel}
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-12 rounded-xl bg-[var(--input-background)] border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      );

    default: {
      // text / number etc.
      const type =
        inputType || (String(dataType).toLowerCase().startsWith("number") ? "number" : "text");

      return (
        <div className="space-y-2">
          {commonLabel}
          <Input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholderText || label}
            className="h-12 rounded-xl bg-[var(--input-background)] border-[var(--border)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      );
    }
  }
}
