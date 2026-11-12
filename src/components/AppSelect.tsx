import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Radix Select reserves "" for "no value", so empty options use a stand-in.
const NONE = "__none__";

export type AppSelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export function AppSelect({
  value,
  onValueChange,
  options,
  invalid,
  describedBy,
  required,
  label,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
  /** Accessible name when no visible <label> wraps the select. */
  label?: string;
}) {
  return (
    <Select
      value={value === "" ? NONE : value}
      onValueChange={(next) => onValueChange(next === NONE ? "" : next)}
    >
      <SelectTrigger
        className="app-select-trigger"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        aria-label={label}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="app-select-content" position="popper">
        {options.map((option) => (
          <SelectItem
            key={option.value || NONE}
            value={option.value || NONE}
            disabled={option.disabled}
            className="app-select-item"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
