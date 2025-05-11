import React from "react";
import { Calculator } from "lucide-react";

interface StyledResultsProps {
  results: Record<string, unknown>;
  spec?: {
    rules?: Array<{ formula: string; label?: string }>;
  };
}

interface TotalResultType {
  key: string;
  label: string;
  value: number;
}

/**
 * Formats a number using Swedish locale formatting.
 * If the input is not a number, returns it as a string.
 */
const formatCurrency = (value: unknown): string => {
  if (typeof value !== 'number') {
    return String(value);
  }
  return value.toLocaleString("sv-SE", {
    maximumFractionDigits: 2,
  });
};

const StyledResults: React.FC<StyledResultsProps> = ({ results, spec }) => {
  if (Object.keys(results).length === 0) {
    return null;
  }

  // Build a mapping of variable names to their human-readable labels
  const labelMap: Record<string, string> = {};
  if (spec?.rules) {
    spec.rules.forEach(rule => {
      const match = rule.formula.match(/(\w+)\s*=/);
      if (match && match[1] && rule.label) {
        labelMap[match[1]] = rule.label;
      }
    });
  }

  // Define the keys that are total results (LLM-generated so can sometimes be wrong)
  const totalKeys = ['total_price', 'final_price', 'comparison_price'];
  let totalResult: TotalResultType | null = null;
  const otherResults: Array<{key: string, label: string, value: unknown}> = [];

  Object.entries(results).forEach(([key, value]) => {
    // Use the mapped label if available, otherwise use the key
    const label = labelMap[key] || key;
    
    if (totalKeys.includes(key.toLowerCase()) && typeof value === 'number') {
      // Check if current value is greater than existing total or if totalResult is null
      if (!totalResult || value > totalResult.value) {
         totalResult = { key, label, value };
      } else {
         // If it's another total key but not larger, add to other results
         otherResults.push({ key, label, value });
      }
    } else {
      otherResults.push({ key, label, value });
    }
  });

  return (
    <div className="w-full bg-emerald-50 p-4 rounded-lg border border-emerald-300">
      <div className="flex items-center justify-between mb-3 border-b border-emerald-300 pb-2">
        <div className="flex items-center">
          <Calculator className="h-5 w-5 text-emerald-900 mr-2" />
          <h3 className="text-lg font-medium text-emerald-900">Resultat</h3>
        </div>
      </div>
      <div className="space-y-2 max-h-[calc(100vh-10rem)] overflow-y-auto">
        {/* Display other results first */}
        {otherResults.map(({ key, label, value }) => (
          <div key={key} className="flex justify-between items-center text-sm">
            <span className="text-emerald-700 truncate pr-2">{label}:</span>
            <span className="font-medium text-emerald-800 flex-shrink-0">
              {formatCurrency(value)}
            </span>
          </div>
        ))}
        {/* Display the total result at the end */}
        {totalResult && (
          <div className="flex justify-between items-center pt-3 border-t border-emerald-100 mt-3">
            <span className="text-md font-medium text-emerald-900">{totalResult.label}:</span>
            <span className="text-lg font-bold text-emerald-900">
              {formatCurrency(totalResult.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyledResults; 