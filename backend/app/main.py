import os
import shutil
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.step1_parse.pdfParser import extract_everything
from app.step3_filter.filter_sections import analyze_pdf_sections
from app.step2_summarize.summarize import run_summarization
from app.step4_evaluate.evaluate import parse_evaluation_components

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

@app.get("/")
def read_root():
    return {"message": "FastAPI Backend is Running!"}


UPLOAD_DIR = "app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)  


# Elias -----------------------------------------------

@app.post("/everything-scraper/")
async def upload_p(file: UploadFile = File(...)):
    """
    Uploads a PDF file, extracts all structured content (sections, subsections, text, and tables),
    and returns the extracted data as a JSON response.
    """
    # Save the uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Process the PDF and extract structured content
    extracted_data = extract_everything(file_path)

    return extracted_data


# AMMAR -----------------------------------------------

# endpoint for testing steps 1 and 3
@app.post("/analyze-pdf-sections/")
async def analyze_pdf_sections_endpoint(file: UploadFile = File(...)):
    """
    Analyzes PDF sections using LLM to identify sections that match specific criteria.
    """
    file_path = os.path.join(UPLOAD_DIR, file.filename) 

    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Parse the file to get subsections
        parsed_data = extract_everything(file_path)
        
        # Process sections to find those that match criteria
        analysis_results = await analyze_pdf_sections({"subsections": parsed_data})
        
        return analysis_results
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Analysis failed: {str(e)}"}
        )


# main endpoint for the full pipeline
@app.post("/parse-with-summary/")
async def parse_with_summary_endpoint(file: UploadFile = File(...)):
    """
    Full pipeline with summarization: parses PDF, creates a summary of the evaluation model,
    analyzes sections, and extracts evaluation components with the summary as additional context.
    """
    file_path = os.path.join(UPLOAD_DIR, file.filename) 

    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Parse the file to get all content
        parsed_data = extract_everything(file_path)

        # First, generate a summary of the evaluation model from all content
        summary_results = await run_summarization(parsed_data)

        # Process sections to find those that match criteria
        analysis_results = await analyze_pdf_sections({"subsections": parsed_data})

        
        # Add the summary to the analysis results
        analysis_results["evaluation_summary"] = summary_results.get("summary", "")
        print("matching sections", analysis_results.get("matching_sections", []))
        print("summary", analysis_results.get("evaluation_summary", ""))

        # Extract evaluation components from matching sections with the summary as context
        components_results = await parse_evaluation_components(analysis_results)
        print("components_results", components_results)
        
        # Return both components_results and summary
        return {
            **components_results,
            "summary": summary_results.get("summary", "")
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Full pipeline with summary failed: {str(e)}"}
        )

