import React, { useMemo, useState } from "react";
import { create, all } from "mathjs";
import ApiClient from "@/lib/client";

// ─── mathjs in predictable mode ─────────────────────────────────────────────
const math = create(all, { predictable: true });

export type RadioOption = string | { label: string; value: number };

export type VariableInputType = "number" | "yesno" | "radio";

export interface VariableSpec {
  label: string;
  input: VariableInputType;
  domain?: { min?: number; max?: number };
  /**
   * For radio. When object form is used, `value` **must** be numeric
   */
  options?: RadioOption[];
  category?: string;
}

export interface RuleSpec {
  label: string;
  formula: string;
}

export interface Spec {
  variables: Record<string, VariableSpec>;
  rules: RuleSpec[];
  summary?: string;
}

/** Represents a specific error type for missing fields */
export interface MissingFieldsError {
    type: 'missing_fields';
    fields: string[];
}

// ─── Helper: evaluate rule list ─────────────────────────────────────────────
function evaluateRules(rules: RuleSpec[], vars: Record<string, unknown>) {
  const scope: Record<string, unknown> = { ...vars };
  rules.forEach((r) => {
    try {
      math.evaluate(r.formula, scope);
    } catch (err) {
      console.error("Evaluation error", r.formula, err);
      throw err;
    }
  });
  return scope;
}

export const useEvaluator = () => {
  /** spec loaded from file */
  const [spec, setSpec] = useState<Spec | null>(null);
  /** Can be a string for general errors or an object for specific validation errors */
  const [error, setError] = useState<string | MissingFieldsError | null>(null);
  /** form state – raw user entries */
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  /** Loading state for file upload */
  const [loading, setLoading] = useState<boolean>(false);
  /** Progress state for loading indicator */
  const [progress, setProgress] = useState<number>(0);
  /** Summary from the API response */
  const [summary, setSummary] = useState<string | null>(null);
  /** Filename of the uploaded file */
  const [filename, setFilename] = useState<string | null>(null);

  // ─ change handlers ─
  const update = (id: string, value: string | number | boolean) =>
    setForm((p) => ({ ...p, [id]: value }));

  /**
   * Handles the file selection, uploads it using ApiClient, and updates the state.
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);
    setSpec(null); // Clear previous spec
    setForm({});   // Clear previous form data
    setSummary(null); // Clear previous summary
    setFilename(file.name); // Store the filename

    const apiClient = new ApiClient();

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 120);

    try {
      const response = await apiClient.parseMathjsRules(file);
      clearInterval(progressInterval);
      setProgress(100);

      // console.log("response", response);
      
      if (response.success && response.data) {
        setSpec(response.data as unknown as Spec);
        
        const summaryText = response.summary || response.data.summary || null;
        if (summaryText) {
          setSummary(summaryText);
        }
        
        const init: Record<string, string | number | boolean> = {};
        Object.keys(response.data.variables).forEach((k) => (init[k] = ""));
        setForm(init);
        setError(null);
      } else {
        setError(response.error ?? "Filen kunde inte bearbetas, eller saknar utvärderingsmodell. Vänligen försök igen med en annan PDF-fil som innehåller information om en utvärderingsmodell.");
        setSpec(null);
        setSummary(null);
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error("Error uploading or parsing file:", err);
      setError(err instanceof Error ? err.message : "Filen kunde inte bearbetas, eller saknar utvärderingsmodell. Vänligen försök igen med en annan PDF-fil som innehåller information om en utvärderingsmodell.");
      setSpec(null);
    } finally {
      setTimeout(() => {
         setLoading(false);
         setProgress(0);
      }, 500); 
    }
  };

  // ─ compute scope ─
  const scope = useMemo(() => {
    if (!spec) return {};

    const typed: Record<string, unknown> = {};
    Object.entries(form).forEach(([k, v]) => {
      const def = spec.variables[k];
      if (!def) return; 

      if (v === "" || v === null) {
          typed[k] = v;
          return;
       };

      if (def.input === "yesno") typed[k] = v === true || v === "true";
      else if (def.input === "number") {
         const num = Number(v);
         typed[k] = isNaN(num) ? null : num;
      }
      else if (def.input === "radio") {
        const opt = def.options?.find((o) =>
          typeof o === "string" ? o === v : String(o.value) === String(v)
        );
        if (opt && typeof opt !== "string") typed[k] = opt.value;
        else typed[k] = v;
      } else typed[k] = v;
    });

    const missing = Object.entries(typed)
        .filter(([_, value]) => {
            if (value === "" || value === null || value === undefined) return true;
            return false;
        })
        .map(([k]) => spec.variables[k]?.label || k); 

    if (missing.length) {
       const shortLabels = missing.map(label => {
           const words = label.split(' ');
           return words.slice(0, 3).join(' ') + (words.length > 2 ? '...' : '');
       });
      setError({ type: 'missing_fields', fields: shortLabels });
      return {}; 
    }

    setError(null); 
    try {
      const completeTyped = { ...typed };
       Object.keys(spec.variables).forEach(k => {
           if (!(k in completeTyped)) {
               completeTyped[k] = null;
           }
       });

      return evaluateRules(spec.rules, completeTyped);
    } catch (evalError){
       console.error("Rule evaluation error:", evalError);
       setError(evalError instanceof Error ? evalError.message : "Ett fel uppstod vid beräkning av regler.");
      return {};
    }
  }, [form, spec]); 

  const calculatedResults = useMemo(() => {
      if (!spec || error) return null;

      const results = Object.entries(scope).filter(
         ([key]) => !Object.prototype.hasOwnProperty.call(spec.variables, key)
      );
       return results.length > 0 ? Object.fromEntries(results) : null;
  }, [scope, spec, error]);

  const clearEvaluation = () => {
    setSpec(null);
    setError(null);
    setForm({});
    setSummary(null);
    setFilename(null);
  };

  return {
    spec,
    error,
    form,
    loading,
    progress,
    summary,
    filename,
    handleFileChange,
    update,
    calculatedResults,
    clearEvaluation,
  };
};
