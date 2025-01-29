import os
from typing import List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.graph import invoke_chain

# Initialize FastAPI app
app = FastAPI(
    title="Otto AI Assistant",
    version="1.0",
    description="A simple AI assistant powered by LangGraph",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    context: Dict = {}

class ChatResponse(BaseModel):
    data: Dict[str, List[Message]]
    error: str | None = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # try:
    # Extract thread_id from context or use default
    thread_id = request.context.get("thread_id", "default")
    
    # Call the LangGraph chain
    result = invoke_chain(request.query, thread_id)
    
    return ChatResponse(data=result)
    # except Exception as e:
    #     print("Error in chat function:", e)
    #     raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001) 