import os
import logging
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from app.graph import invoke_chain

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Otto AI Assistant",
    version="1.0",
    description="A simple AI assistant powered by LangGraph",
)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    context: dict

class ChatResponse(BaseModel):
    data: dict
    error: Optional[str] = None

@app.get("/")
async def root():
    try:
        logger.info("Root endpoint called")
        return {"message": "Hello World"}
    except Exception as e:
        logger.error(f"Error in root endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    """Chat endpoint that processes messages and returns responses."""
    try:
        logger.info(f"Chat endpoint called with request: {request}")
        thread_id = request.context.get("thread_id", "default")
        result = invoke_chain(request.query, thread_id)
        logger.info(f"Chat result: {result}")
        return ChatResponse(data=result["data"], error=result["error"])
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return ChatResponse(data={}, error=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001) 