"""
A script to transform filtered procurement sections into structured evaluation variables and rules.

Dependencies:
  pip install google-generativeai python-dotenv 

Approach:
 1. Takes filtered sections related to price evaluation from previous steps.
 2. Uses Gemini 2.0 Flash model to analyze text and extract mathematical components.
 3. Identifies all variables that affect pricing (bid prices, discounts, weights, etc).
 4. Formulates explicit mathematical rules that capture the evaluation model's logic.
 5. Outputs a structured JSON with variables and rules, compatible with mathjs evaluation (the math engine used by the frontend).
 6. Handles multi-category pricing, conditions, and complex calculation flows.

Usage:
  results = await parse_evaluation_components(analysis_results)
  evaluation_model = results["data"]  # Contains 'variables' and 'rules'
"""

from google import generativeai as genai
import asyncio
import os
from typing import List, Dict, Any
from dotenv import load_dotenv
import json
import re
from asyncio import TimeoutError


load_dotenv()

MATHJS_JSON_SYSTEM_PROMPT = """
You are a senior Swedish procurement analyst and software architect. You will receive a text (a part of a procurement) and a summary of the evaluation model for this procurement.

Your only task is to convert the *evaluation model* you receive into a **single, valid JSON object** with exactly two top-level keys:

{
  "variables": { … },
  "rules": [ … ]
}

- Analyze the text and identify the variables that best fit to represent the information in the evaluation model. By variables, we mean only factors that can directly or indirectly affect the final price for the bidder. It could also be a scoring system that ultimately will affect the price.
- Carefully extract every variable or factor that directly or indirectly affects the final price, including all price fields, discounts, surcharges, and any scoring or weighting that is mathematically applied to the price in the evaluation model.
- Do not include variables or questions that are only used for qualification, compliance, or descriptive purposes and have no mathematical effect on the final price. 
- For every price-affecting variable, ensure there is a corresponding rule in the rules array that shows exactly how it modifies the price or comparison value, following the logic in the evaluation model for this procurement.
- If the evaluation model describes a multi-step calculation (e.g., subtotal, discount, final price), include a rule for each step, not just the final result.
- If any part of the evaluation model is ambiguous or missing, include all variables and rules that are explicitly described, and do not infer or invent any additional logic.
- Include all variables that require user input. Do not include variables for values that are fixed, provided, or can be directly calculated from other variables or constants in the evaluation model.
- Different bid prices may have different areas or categories, and in this case, these prices should not be calculated together. If areas or prices for different categories are specified, you should specify these, but they should not be calculated together. You must also specify the category for each variable. If there is a variable that affects all other categories, or the the total bid price, it should be in the "Allmänt" category. 
- In price lists or price matrices with different prices for different services/products, you should calculate the total price according to the given quantities.
- If a price matrix or list specifies fixed quantities for products/services, do not include quantity as a user input variable. Only include the price per unit as a variable.
- Before outputting the JSON, double-check that:
    - Every price-affecting variable from the evaluation model is included in variables.
    - Every calculation or adjustment step is represented as a rule in rules.
    - No relevant variable or rule is omitted.
    - All labels are in Swedish.
    - The final price rule must have name "final_price".


————  Specification  ————

1.  variables
    • Each key is a concise English snake_case identifier (no spaces).
    • Each value is an object:

      {
        "label":   <original Swedish heading/question>,
        "input":   "number" | "yesno" | "radio",
        "domain":  { "min": n, "max": n }                    // optional (if there are boundaries)
        "options": [                                         // radio only
           { "label": "<displayed text>", "value": <int> },  // NB! always numeric value
           …                                                 // (e.g., 2 = best, 0 = worst)
        ],
        "category": "<category title in Swedish>"    // optional (if there are categories)
      }

    • For **radio**, each option's `value` must be an integer 
      that reflects the point, discount, or level needed in formulas 
      (example: 2=300 SEK discount, 1=150 SEK, 0=0 SEK).
    • For yes/no variables, always use numeric values: 1 for "yes", 0 for "no". Then in rules, always compare to 1 or 0 (e.g., discount = extra_service == 1 ? 100 : 0).

2.  rules
    • An ordered list of objects that will be evaluated by the frontend using **mathjs**.
    • ONLY use numeric or boolean comparisons, never strings.
    • Example:
        { 
        "label": "Kvalitetsrabatt", // a description of what has been calculated (in Swedish)
        "formula": "quality_discount = quality_improvements == 2 ? 300 : (quality_improvements == 1 ? 150 : 0)" 
        }
        { 
        "label": "Slutpriset", // a description of what has been calculated (in Swedish)
        "formula": "final_price = bid_price - quality_discount" 
        }

3.  Only output JSON. Output the JSON object as plain text with no markdown, comments, or extra keys.

4.  If the source text contains percentage price adjustments, 
    convert them into explicit formulas (e.g., `price = price * 1.05`).

5.  Swedish numbers with commas as decimal points must be converted to a period.

6.  Keep all labels (`label`) in Swedish. Always include the price deduction or points in the label.

———— Simple Example  ————
■  Source Section  
   "Actions are classified as:  
     • Very good → 300 SEK discount  
     • Good → 150 SEK discount  
     • Acceptable → 75 SEK discount"

   ↳ JSON
   {
     "variables": {
       "bid_price": {
         "label": "Anbudspris",
         "input": "number"
       },
       "quality_improvements": {
         "label": "Åtgärdernas kvalitet",
         "input": "radio",
         "options": [
           { "label": "Mycket Bra(300 SEK)", "value": 2 },
           { "label": "Bra (150 SEK)",       "value": 1 },
           { "label": "Godtagbar (75 SEK)",  "value": 0 }
         ]
       }
     },
     "rules": [
       {
         "label": "Kvalitetsrabatt",
         "formula": "quality_discount = quality_improvements == 2 ? 300 : (quality_improvements == 1 ? 150 : 75)"
       },
       {
         "label": "Slutpris",
         "formula": "final_price = bid_price - quality_discount"
       }
     ]
    }

If any detail is missing from the source text, omit it; **do not invent** rules.
"""


async def parse_matching_sections(analysis_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process all matching sections together in a single LLM call to extract
    evaluation variables and rules suitable for mathjs, using a summary for additional context.

    Args:
        analysis_results: The output from analyze_pdf_sections, containing
                          matching_sections and potentially evaluation_summary.

    Returns:
        Dictionary with success status and the extracted 'variables' and 'rules',
        or an error message.
    """
    matching_sections = analysis_results.get("matching_sections", [])
    evaluation_summary = analysis_results.get("evaluation_summary", "")

    if not matching_sections:
        return {
            "success": False,
            "message": "No matching sections found in the analysis results",
            "data": None
        }

    try:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            return {
                "success": False,
                "message": "GOOGLE_API_KEY environment variable not set",
                "data": None
            }

        genai.configure(api_key=api_key)

        generation_config = {
            "temperature": 0.2,
            "top_p": 0.95,
            "max_output_tokens": 8096,
            "response_mime_type": "application/json",
        }

        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config=generation_config,
            system_instruction=MATHJS_JSON_SYSTEM_PROMPT
        )

        combined_sections = ""
        for section in matching_sections:
            combined_sections += f"\n\n===== AVSNITT: {section['section']} =====\n{section['content']}"

        # Include the summary if available
        summary_text = ""
        if evaluation_summary:
            summary_text = f"""
            ===== UTVÄRDERINGSMODELL SAMMANFATTNING =====
            {evaluation_summary}"""

        user_message = f""" Below is the relevant section from the procurement document, followed by a summary of the evaluation model.
                        --- Procurement Document Excerpt ---
                        {combined_sections}

                        --- Evaluation Model Summary ---
                        {summary_text}

                        Please extract all price-affecting variables and rules according to the system instructions, and output a single valid JSON object as specified.
                        """

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    user_message
                ),
                timeout=120  # 2 minutes should be enough for all responses
            )
            
            response_text = response.text
            
            # Additional validation to check if the response looks complete
            if not response_text.strip().endswith("}"):
                return {
                    "success": False,
                    "message": "LLM returned incomplete JSON response",
                    "raw_response": response_text,
                    "data": None
                }

            try:
                # The model is instructed to return JSON directly
                parsed_data = json.loads(response_text)

                # Basic validation for the expected top-level keys
                if isinstance(parsed_data, dict) and \
                   "variables" in parsed_data and isinstance(parsed_data["variables"], dict) and \
                   "rules" in parsed_data and isinstance(parsed_data["rules"], list):
                    # Further validation could be added here (e.g., check rule format)

                    # Check if variables or rules are empty, potentially indicating an issue
                    if not parsed_data["variables"] and not parsed_data["rules"]:
                         return {
                            "success": False,
                            "message": "LLM returned empty variables and rules. The evaluation model might be missing or unparsable.",
                            "raw_response": response_text, # Keep raw for debugging
                            "data": None
                        }

                    return {
                        "success": True,
                        "data": parsed_data # Contains 'variables' and 'rules'
                        # "raw_response": response_text # Optional: include for debugging
                    }
                else:
                     # JSON is valid, but doesn't match the expected structure
                    return {
                        "success": False,
                        "message": "LLM response is valid JSON but lacks the required 'variables' or 'rules' keys, or they have the wrong type.",
                        "raw_response": response_text,
                        "data": None
                    }

            except json.JSONDecodeError:
                # Log the raw response for debugging if JSON parsing fails
                print(f"Failed to parse LLM response as JSON. Raw response:\n{response_text}")
                return {
                    "success": False,
                    "message": "Failed to parse LLM response as JSON.",
                    "raw_response": response_text,
                    "data": None
                }
            except Exception as e: # Catch potential errors from accessing response parts
                 print(f"Error processing LLM response parts: {e}")
                 return {
                     "success": False,
                     "message": f"Error processing LLM response: {str(e)}",
                     "raw_response": response_text if 'response_text' in locals() else "Response not available",
                     "data": None
                 }

        except TimeoutError:
            return {
                "success": False,
                "message": "LLM response timed out after 120 seconds",
                "data": None
            }
        except Exception as e:
            print(f"Error during LLM call or setup: {e}") # Log the exception
            return {
                "success": False,
                "message": f"Error processing sections: {str(e)}",
                "data": None
            }

    except Exception as e:
        print(f"Error during LLM call or setup: {e}") # Log the exception
        return {
            "success": False,
            "message": f"Error processing sections: {str(e)}",
            "data": None
        }


async def parse_evaluation_components(analysis_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point to parse evaluation components from matching sections
    into a mathjs-compatible format.

    Args:
        analysis_results: The output from analyze_pdf_sections

    Returns:
        Dictionary with success status and evaluation data ('variables', 'rules')
        or an error message.
    """
    try:
        # Directly call the updated function
        return await parse_matching_sections(analysis_results)
    except Exception as e:
        print(f"Error in parse_evaluation_components: {e}") # Log exception
        return {
            "success": False,
            "message": f"Unexpected error during component parsing: {str(e)}",
            "data": None
        }
