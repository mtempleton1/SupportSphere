import logging
from mangum import Mangum
from fastapi.middleware.cors import CORSMiddleware
from app.server import app

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add CORS middleware with specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,
)

# Create Lambda handler with proper configuration
handler = Mangum(
    app,
    lifespan="off",
    api_gateway_base_path=None,  # Handle root path correctly
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001) 