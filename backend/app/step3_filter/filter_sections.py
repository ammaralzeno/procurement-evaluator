"""
A script to analyze and filter procurement sections for relevance to pricing and evaluation models.

Dependencies:
  pip install google-generativeai python-dotenv

Approach:
 1. Takes structured sections from the parsed procurement PDF.
 2. Analyzes each section using Google's Gemini 2.0 Flash model for pricing/evaluation relevance.
 3. Identifies sections containing pricing details, discounts, additions, scoring mechanisms, etc.
 4. Processes all sections in parallel for efficiency.
 5. Returns a filtered set of sections that are relevant to the evaluation model.

Usage:
  results = await analyze_pdf_sections(parsed_pdf_data)
  matching_sections = results["matching_sections"]
"""

from google import generativeai as genai
import asyncio
from typing import List, Dict, Any
import os
from dotenv import load_dotenv


load_dotenv()

SECTION_ANALYSIS_CRITERIA = """
Du är en expert på dokumentanalys inom offentliga upphandlingar. Din uppgift är att noggrant granska den medföljande texten, som är ett utdrag från en utvärderingsrapport, och avgöra om den innehåller någon information eller detaljer som direkt eller indirekt påverkar det slutgiltiga anbudspriset. Detta inkluderar alla uppgifter som kan ge ledtrådar om poängsättning, prisjusteringar eller andra mekanismer som påverkar hur mycket det slutliga priset blir. 

Fokusera på att identifiera alla förekomster av, eller referenser till, följande (och liknande) begrepp och mekanismer:

- **Pris**: t.ex. anbudspris, total kostnad, grundpris, nettoprissättning
- **Avdrag**: t.ex. prisavdrag, minskning av pris, avdrag, poängavdrag
- **Tillägg**: t.ex. pristillägg, ökning, extra kostnad, påslag
- **Mervärde**: t.ex. mervärdeskriterier, extra värde, bonus, kvalitetsmervärde
- **Tilldelningskriterier och utvärderingsgrunder**: t.ex. kriterier, bedömningsgrunder, viktning, utvärderingsmetoder, prövning av anbud
- **Utvärderingsmodeller/metoder**: t.ex. utvärderingsmodell, utvärderingsmetod, poängsystem, referenspoäng, beräkningsmetodik
- **Ersättning och kostnadsjusteringar**: t.ex. ersättning, justering av slutpris, ekonomiska påföljder

Texten kan innehålla både direkta prisangivelser och indirekta beskrivningar av hur poäng, avdrag, tillägg eller andra ekonomiska effekter appliceras, inklusive eventuella villkor eller mekanismer som påverkar beräkningen av utvärderingspriset. 
Din uppgift är att fånga även de subtila eller dolda uttrycken som kan ha inverkan på den ekonomiska bedömningen.

Om texten innehåller någon information eller något uttryck som faller in under dessa kategorier, eller som antyder hur priset justeras (oavsett om det gäller poäng, avdrag, tillägg, mervärde eller andra relaterade faktorer), ska du svara med "YES". Om ingen sådan information finns, svara med "NO".

Var noga med att analysera texten i detalj och säkerställ att inga viktiga ekonomiska indikatorer förbises.
"""

async def process_pdf_section(section: Dict[str, str]) -> Dict[str, Any]:
    """
    Process a single PDF section with the LLM and check if it meets criteria.
    
    Args:
        section: Dictionary containing 'section' (title) and 'text' (content)
        
    Returns:
        Dictionary with section info and whether it meets criteria
    """
    try:
        # Get API key from environment
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            return {
                "section": section["section"],
                "content": section["text"],
                "meets_criteria": False,
                "analysis": "Error: GOOGLE_API_KEY environment variable not set. Make sure to add it to your .env file and install python-dotenv."
            }
            
        # Configure the API with the key
        genai.configure(api_key=api_key)
        
        # Set up the model
        generation_config = {
            "temperature": 0.2,
            "top_p": 0.95,
            "max_output_tokens": 4096,
        }
        
        # Create the model
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-001", 
            generation_config=generation_config
        )
        
        system_prompt = "Språk: Svenska. Du är en expert dokumentanalysator. Utvärdera om följande dokumentavsnitt uppfyller något av kriterierna."
        user_message = f"Kriterier: {SECTION_ANALYSIS_CRITERIA}\n\nAvsnitt: {section['section']}\n\nInnehåll: {section['text']}"
        
        response = await asyncio.to_thread(
            model.generate_content,
            f"{system_prompt}\n\n{user_message}"
        )
        
        response_text = response.text
        
        # Check if criteria is met
        meets_criteria = "yes" in response_text.lower() or "true" in response_text.lower()
        
        return {
            "section": section["section"],
            "content": section["text"],
            "meets_criteria": meets_criteria,
            "analysis": response_text
        }
    except Exception as e:
        return {
            "section": section["section"],
            "content": section["text"],
            "meets_criteria": False,
            "analysis": f"Error: {str(e)}"
        }

async def process_pdf_sections(parsed_pdf_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process PDF sections in parallel and extract those that meet criteria.
    
    Args:
        parsed_pdf_data: The output from pdfParser containing sections
        
    Returns:
        Dictionary with all sections and matching sections that meet criteria
    """
    sections = parsed_pdf_data.get("subsections", {}).get("content", [])
    
    if not sections:
        return {
            "status": "error",
            "message": "No sections found in the parsed PDF data",
            "matching_sections": []
        }
    
    # Create tasks for processing each section in parallel
    tasks = [process_pdf_section(section) for section in sections]
    results = await asyncio.gather(*tasks)
    
    # Filter sections that meet criteria
    matching_sections = [result for result in results if result["meets_criteria"]]
    
    return {
        "status": "success",
        "total_sections": len(sections),
        "matching_count": len(matching_sections),
        "all_sections": results,
        "matching_sections": matching_sections
    }

async def analyze_pdf_sections(parsed_pdf_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point to analyze PDF sections from parser output.
    
    Args:
        parsed_pdf_data: The output from pdfParser
        
    Returns:
        Analysis results with matching sections
    """
    try:
        return await process_pdf_sections(parsed_pdf_data)
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error processing PDF sections: {str(e)}",
            "matching_sections": []
        }
