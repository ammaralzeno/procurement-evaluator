"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, FileIcon } from 'lucide-react';
import StyledUploadFile from "@/components/UploadFile";
import StyledLoadingState from "@/components/LoadingState";
import { StyledNumberInput, StyledYesNoSelect, StyledRadioGroup } from "@/components/FormFields";
import StyledResults from "@/components/Results";
import StyledSummary from "@/components/Summary";
import { useEvaluator, VariableSpec, MissingFieldsError, RadioOption } from "../controller/Evaluator";


interface TenderEvaluatorProps {
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────
const TenderEvaluator: React.FC<TenderEvaluatorProps> = ({ className = "" }) => {
  const {
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
  } = useEvaluator();

  /**
   * Determines if there are any variables with a defined category.
   */
  const actuallyHasCategorizedVariables = useMemo(() => {
    if (!spec?.variables) return false;
    return Object.values(spec.variables).some(v => v.category && v.category.trim() !== '');
  }, [spec]);

  /**
   * Generates a list of tab names to render.
   * Includes defined categories and an "Övrigt" tab if there are uncategorized variables
   * alongside defined categories.
   */
  const tabsToRender = useMemo(() => {
    if (!actuallyHasCategorizedVariables || !spec?.variables) return [];

    const definedCategories = [...new Set(
      Object.values(spec.variables)
        .map(v => v.category)
        .filter(c => typeof c === 'string' && c.trim() !== '') as string[]
    )].sort();

    const hasUncategorizedItems = Object.values(spec.variables).some(v => !v.category || v.category.trim() === '');

    // Only add "Övrigt" if there are defined categories AND uncategorized items.
    if (hasUncategorizedItems && definedCategories.length > 0) {
      return [...definedCategories, "Övrigt"];
    }
    
    // If only defined categories, return them.
    // If only uncategorized items, `actuallyHasCategorizedVariables` would be false,
    // so this path wouldn't be hit for that specific case, resulting in no tabs.
    return definedCategories; 
  }, [spec, actuallyHasCategorizedVariables]);

  // ─ render helpers for the different input types ─
  const renderField = (id: string, v: VariableSpec) => {
    switch (v.input) {
      case "number":
        return (
          <StyledNumberInput
            id={id}
            label=""
            value={form[id] as string | number}
            onChange={(value) => update(id, value)}
            min={v.domain?.min}
            max={v.domain?.max}
          />
        );
      case "yesno":
        return (
          <StyledYesNoSelect
            id={id}
            label=""
            value={form[id] as boolean | string}
            onChange={(value) => update(id, value)}
          />
        );
      case "radio":
        if (!v.options) return null;
        return (
          <StyledRadioGroup
            id={id}
            label=""
            options={v.options as RadioOption[]}
            value={form[id] as string | number}
            onChange={(value) => update(id, value)}
          />
        );
      default:
        return null;
    }
  };

  // ─ ui ─
  return (
    <div className={`min-h-screen w-full grid grid-cols-12 gap-4 bg-gradient-to-b from-white to-indigo-50 p-4 relative ${className}`}>
      {loading && !spec ? (
        <div className="col-span-12 flex justify-center items-center">
          <StyledLoadingState progress={progress} />
        </div>
      ) : !spec ? (
        <div className="col-span-12 flex justify-center items-center">
          <StyledUploadFile
            loading={loading}
            error={typeof error === 'string' ? error : null}
            handleFileChange={handleFileChange}
          />
        </div>
      ) : (
        <>
          {/* Error Alert for missing fields - Top Right */}
          {error && spec && (
            <div className="col-span-4 col-start-9 row-start-1">
              <Alert className="border-yellow-500 text-yellow-800 bg-yellow-50 [&>svg]:text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Kalkylfel</AlertTitle>
                <AlertDescription className="max-h-[calc(100vh-10rem)] overflow-y-auto">
                  {typeof error === 'string' ? (
                    error
                  ) : (error as MissingFieldsError).type === 'missing_fields' ? (
                    <>
                      Följande fält saknar värde eller är ogiltiga:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        {(error as MissingFieldsError).fields.map((field, index) => (
                          <li key={index}>{field}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    'Ett okänt valideringsfel har inträffat.'
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Input Card - Left side of the page */}
          <div className="col-span-8 row-start-1">
            <Card className="shadow-sm bg-white border border-indigo-100 mb-4">
              <CardHeader className="border-b border-indigo-100">
                <CardTitle className="text-2xl text-center text-indigo-900">
                  Utvärderingsmodellen
                  {filename && (
                    <div className="flex items-center justify-center mt-2 text-base font-normal text-indigo-600">
                      <FileIcon className="h-4 w-4 mr-2" />
                      {filename}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent 
                className="pt-6 flex flex-col" 
                style={{ 
                  maxHeight: 'calc(100vh - 10rem)',
                  overflow: 'hidden'
                }}
              >
                {actuallyHasCategorizedVariables && tabsToRender.length > 0 && spec ? (
                  <Tabs defaultValue={tabsToRender[0]} className="w-full flex flex-col flex-1 min-h-0">
                    <TabsList className="pb-2 mb-2 flex flex-wrap justify-start shrink-0 h-full">
                      {tabsToRender.map(categoryName => (
                        <TabsTrigger
                          key={categoryName}
                          value={categoryName}
                          className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:bg-indigo-50 data-[state=inactive]:text-indigo-700 hover:bg-indigo-100 px-4 py-2 m-1 text-sm rounded-xl"
                        >
                          {categoryName}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <div className="grid grid-cols-12 gap-4 mt-1 mb-2 font-medium text-indigo-900 border-b pb-2 shrink-0">
                      <div className="col-span-5">Variabel</div>
                      <div className="col-span-7">Värde</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto min-h-0">
                      {tabsToRender.map(categoryName => (
                        <TabsContent key={categoryName} value={categoryName} className="mt-0 pt-0 h-full">
                          <div className="space-y-2 pr-2">
                            {Object.entries(spec.variables) 
                              .filter(([_, v_spec]) => {
                                if (categoryName === "Övrigt") {
                                  return !v_spec.category || v_spec.category.trim() === '' || v_spec.category === "Övrigt";
                                }
                                return v_spec.category === categoryName;
                              })
                              .map(([id, v_spec]) => (
                                <div key={id} className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-100">
                                  <div className="col-span-5 text-sm font-medium">{v_spec.label}</div>
                                  <div className="col-span-7">{renderField(id, v_spec)}</div>
                                </div>
                              ))}
                          </div>
                        </TabsContent>
                      ))}
                    </div>
                  </Tabs>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="grid grid-cols-12 gap-4 mb-2 font-medium text-indigo-900 border-b pb-2 shrink-0">
                      <div className="col-span-5">Variabel</div>
                      <div className="col-span-7">Värde</div>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <div className="space-y-2 pr-2 pt-2">
                        {spec && Object.entries(spec.variables).map(([id, v]) => (
                          <div key={id} className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-100">
                            <div className="col-span-5 text-sm font-medium">{v.label}</div>
                            <div className="col-span-7">{renderField(id, v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full  border-indigo-900 text-indigo-900 hover:bg-indigo-50 mt-4 pt-3 pb-3 shrink-0"
                  onClick={clearEvaluation}
                >
                  Ladda upp ett annat dokument
                </Button>
              </CardContent>
            </Card>

          </div>

          {/* Results - Right Side */}
          <div className="col-span-4 col-start-9 row-start-1">
            {error && spec ? null : calculatedResults && (
              <StyledResults 
                results={calculatedResults} 
                spec={spec}
              />
            )}
          </div>
        </>
      )}
      
      {/* Fixed Summary Button - Bottom Right */}
      {summary && (
        <div className="fixed bottom-6 right-6 z-50">
          <StyledSummary summary={summary} />
        </div>
      )}
    </div>
  );
};

export default TenderEvaluator;
