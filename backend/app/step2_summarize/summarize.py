"""
A script to generate a comprehensive text summary of an evaluation model from extracted procurement sections.

Dependencies:
  pip install google-generativeai python-dotenv

Approach:
 1. Takes structured sections data from the PDF extraction step.
 2. Combines all relevant sections into a single comprehensive text.
 3. Uses Google's Gemini 2.0 Flash model to analyze and summarize the evaluation methodology.
 4. Focuses on explaining the model structure, calculations, components, dependencies, and conditions.
 5. Returns the complete natural language summary of the procurement's evaluation model.

Usage:
  result = await run_summarization(extraction_results)
  print(result["summary"])
"""

import os
import asyncio
from typing import Dict, Any
from dotenv import load_dotenv
from google import generativeai as genai

load_dotenv()

# Prompt for summarizing the evaluation model directly from extracted sections
SUMMARIZATION_PROMPT = """
Språk: Svenska. Du är en expertanalytiker av upphandlingsdokument. Din uppgift är att noggrant läsa igenom den medföljande texten, som består av relevanta avsnitt från ett upphandlingsdokument gällande utvärderingsmodellen.

Baserat på texten, generera en **detaljerad textuell sammanfattning** av hela utvärderingsmodellen. Sammanfattningen ska tydligt förklara:

1. **Grundläggande struktur:** Vilka är huvuddelarna i utvärderingen (t.ex. pris, kvalitet, specifika områden)?
2. **Beräkningsflöde:** Hur beräknas det slutliga utvärderingsresultatet (pris eller poäng)? Beskriv stegen från eventuella grundvärden (som anbudspris) till det slutliga jämförelsetalet.
3. **Komponenter:** Identifiera alla specifika faktorer, kriterier, eller indatapunkter som påverkar resultatet (t.ex. anbudspris, poäng för referenser, avdrag för bristande certifiering, tillägg för specifika funktioner, multiplikatorer baserade på kvalitetsnivå).
4. **Beroenden:** Förklara hur olika komponenter relaterar till varandra. Om värdet på en komponent beror på en annan, beskriv detta beroende tydligt.
5. **Villkor och Logik:** Om det finns specifika villkor (t.ex. "om X är uppfyllt, applicera Y avdrag") eller komplex logik (t.ex. mappning av poäng till prisjusteringar, intervallbaserade justeringar), beskriv dessa i detalj.

Observera om det finns matematiska eller beskrivande formler i text så bevara dem och inkludera dessa i din sammanfattning. 
Målet är att producera en klar och heltäckande **textbeskrivning** av utvärderingsmodellen som man senare kan använda för att konstruera en exakt JSON-representation av modellen.
"""

async def summarize_relevant_content(extraction_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Summarize the evaluation model directly from the output of extract_everything().

    Args:
        extraction_results: Dict with key 'content', a list of sections {
            'section': str,
            'text': str
        }

    Returns:
        {'success': bool, 'summary': str, 'message': str (optional)}
    """
    sections = extraction_results.get('content', [])
    if not sections:
        return {
            'success': False,
            'message': 'No extracted content provided for summarization.',
            'summary': ''
        }

    # Combine all sections for context
    combined = ''
    for sec in sections:
        title = sec.get('section', 'Untitled Section')
        body = sec.get('text', '')
        combined += f"\n\n===== SECTION: {title} =====\n{body}"

    # Ensure API key is set
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        return {
            'success': False,
            'message': 'GOOGLE_API_KEY environment variable not set.',
            'summary': ''
        }

    # Configure and call the LLM
    genai.configure(api_key=api_key)
    generation_config = {
        'temperature': 0.2,
        'top_p': 0.95,
        'max_output_tokens': 4096
    }
    model = genai.GenerativeModel(
        model_name='gemini-2.0-flash-001',
        generation_config=generation_config
    )

    system_prompt = f'{SUMMARIZATION_PROMPT}'
    user_prompt = f"Sammanfatta utvärderingsmodellen nedan baserat på dessa sektioner utifrån ett upphandlingsdokument:{combined}"

    try:
        response = await asyncio.to_thread(
            model.generate_content,
            f"{system_prompt}\n\n{user_prompt}"
        )
        text = response.text or ''
        if text:
            return {'success': True, 'summary': text}
        else:
            return {'success': False, 'message': 'LLM returned an empty response.', 'summary': ''}
    except Exception as e:
        return {'success': False, 'message': f'Error during summarization: {e}', 'summary': ''}

async def run_summarization(extraction_results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Entry point for summarization. Delegates to summarize_relevant_content.
    """
    return await summarize_relevant_content(extraction_results)
