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

