"""Simple launcher: `python run.py` from the backend/ folder.
Equivalent to `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`,
but you don't need to set PYTHONPATH manually - env vars come from backend/.env
automatically (see app/core/config.py)."""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
