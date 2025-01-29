# Otto AI Assistant

A simple AI assistant powered by LangGraph and LangServe.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install the package in development mode:
```bash
pip install -e .
```

## Running the Service

To run the service:

```bash
# Make sure you're in the py-otto directory
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

The service will be available at `http://localhost:3001`.

## API Endpoints

### POST /chat

Send a message to Otto.

Request body:
```json
{
  "query": "Your message here",
  "context": {
    "thread_id": "optional_thread_id",
    "previousMessages": []
  }
}
```

Response body:
```json
{
  "data": {
    "messages": [
      {
        "role": "user",
        "content": "Your message"
      },
      {
        "role": "assistant",
        "content": "Otto's response"
      }
    ]
  },
  "error": null
}
``` 