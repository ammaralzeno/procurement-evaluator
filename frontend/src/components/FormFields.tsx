import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

// --- Number Input ---
interface StyledNumberInputProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void; // Input value is always string initially
  min?: number;
  max?: number;
  placeholder?: string;
}

export const StyledNumberInput: React.FC<StyledNumberInputProps> = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "Skriv här",
}) => {


  const domainString = [
    min !== undefined ? `Min: ${min}` : null,
    max !== undefined ? `Max: ${max}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-indigo-900 font-medium">
          {label}
        </Label>
        {domainString && (
          <span className="text-xs text-indigo-600 ml-2">({domainString})</span>
        )}
      </div>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-indigo-200 focus:border-indigo-900 focus:ring-indigo-900"
        type="number"
        min={min}
        max={max}
      />
    </div>
  );
};

// --- Yes/No Checkbox ---
interface StyledYesNoSelectProps {
  id: string;
  label: string;
  value: boolean | string;
  onChange: (value: boolean) => void;
}

export const StyledYesNoSelect: React.FC<StyledYesNoSelectProps> = ({ id, label, value, onChange }) => {
  const isYes = value === true || value === "true";

  const handleCheckedChange = (checked: boolean | 'indeterminate', isYesCheckbox: boolean) => {
    if (isYesCheckbox && checked === true && !isYes) {
      onChange(true);
    } else if (!isYesCheckbox && checked === true && isYes) {
      onChange(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-indigo-900 font-medium">{label}</Label>
      <div className="flex items-center space-x-6 pt-1">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${id}-yes`}
            checked={isYes}
            onCheckedChange={(checked) => handleCheckedChange(checked, true)}
            className="border-indigo-900 data-[state=checked]:bg-indigo-900 data-[state=checked]:text-white"
            aria-label="Ja"
          />
          <Label
            htmlFor={`${id}-yes`}
            className="font-normal cursor-pointer"
          >
            Ja
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${id}-no`}
            checked={!isYes}
            onCheckedChange={(checked) => handleCheckedChange(checked, false)}
            className="border-indigo-900 data-[state=checked]:bg-indigo-900 data-[state=checked]:text-white"
            aria-label="Nej"
          />
          <Label
            htmlFor={`${id}-no`}
            className="font-normal cursor-pointer"
          >
            Nej
          </Label>
        </div>
      </div>
    </div>
  );
};


// --- Radio Group ---
type RadioOption = string | { label: string; value: number };

interface StyledRadioGroupProps {
  id: string;
  label: string;
  options: RadioOption[];
  value: string | number;
  onChange: (value: string) => void;
}

export const StyledRadioGroup: React.FC<StyledRadioGroupProps> = ({ id, label, options, value, onChange }) => {
  return (
    <div className="space-y-4">
      <Label className="text-indigo-900 font-medium">{label}</Label>
      <RadioGroup
        value={String(value)}
        onValueChange={onChange}
        className="flex flex-col space-y-2"
      >
        {options.map((opt, i) => {
          const optionLabel = typeof opt === 'string' ? opt : opt.label;
          const optionValue = String(typeof opt === 'string' ? opt : opt.value);
          const optionId = `${id}-option-${i}`;
          return (
            <div key={i} className="flex items-center space-x-2">
              <RadioGroupItem
                value={optionValue}
                id={optionId}
                className="border-indigo-900 text-indigo-900"
              />
              <Label
                htmlFor={optionId}
                className="font-normal cursor-pointer"
              >
                {optionLabel}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
};