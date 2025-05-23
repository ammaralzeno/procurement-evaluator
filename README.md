# Analyze evaluation models with an LLM algorithm

This project allows you to analyze evaluation models and calculate different bid prices on them, using a Large Language Model (LLM) algorithm. It consists of a Python FastAPI backend and a React/Typescript frontend.

## Getting Started

### Prerequisites

*   Python (version 3.x recommended)
*   pip (Python package installer)
*   Node.js (which includes npm)

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend 
    ```

2.  **Create and activate a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install Python dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Start the backend server:**
    ```bash
    uvicorn app.main:app --reload 
    ```
    The backend server should now be running on `http://127.0.0.1:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

3.  **Start the frontend development server:**
    ```bash
    npm run dev
    ```
    The frontend development server will start, and you can access the application in your browser at `http://localhost:5173`.

    

## Future Work

- **Enhance the algorithm**: Refine the algorithm for more complex evaluation models by dividing steps more granularly and implementing feedback loops for validation. Simply expand on the multi-stage pipeline and perhaps divide the last step to allow for more components. (At around 25-30 components, it starts making mistakes since variables & rules become too complex as they are interdependent)

- **Multi-File Support**: Enable uploading multiple documents to handle cases where evaluation models are spread across different procurement files.

- **Improved Document Parsing**: Integrate OCR and layered extraction approaches to handle varied document structures including image-based content.

- **Expanded Format & Language Support**: Process additional file formats (PDF, XLS, DOCX, JPEG, PNG) and standardize language handling for international procurement documents.

- **Other limitations**: When no strict quantity for products or hours is specified, the system may incorrectly combine hourly rates, yearly rates, and fixed prices. This does work correctly when specific quantities are defined, but needs fallback incase they aren't found or don't exist.
