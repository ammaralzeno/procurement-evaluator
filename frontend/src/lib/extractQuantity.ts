/**
 * Extracts quantity from a mathematical formula string.
 * Looks for patterns like "variable_name = another_variable * number"
 * Only extracts quantities for simple formulas that directly multiply a single variable by a number.
 * There is room for improvement here, but it works for simple cases.
 * 
 * @param formula The formula string to parse
 * @returns The extracted quantity or null if no quantity found or if formula is complex
 */
export function extractQuantity(formula: string): number | null {
  // First check if this is a simple formula with just one variable and a multiplication
  // Should have pattern like: result = variable * number OR result = number * variable
  const simpleFormula = /^\w+\s*=\s*\w+\s*\*\s*\d+(?:\.\d+)?$|^\w+\s*=\s*\d+(?:\.\d+)?\s*\*\s*\w+$/;
  
  if (!simpleFormula.test(formula)) {
    return null; // Not a simple formula, skip quantity extraction (e.g. if it's a sum of multiple variables)
  }
  
  // Now extract the quantity from simple formula
  const multiplicationMatch = formula.match(/\*\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*\*/);
  
  if (multiplicationMatch) {
    // The quantity could be in either capture group depending on the pattern
    const quantity = multiplicationMatch[1] || multiplicationMatch[2];
    return parseFloat(quantity);
  }
  
  return null;
} 