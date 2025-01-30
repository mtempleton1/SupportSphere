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

# Otto AI Assistant - AWS Lambda Deployment

This guide explains how to deploy the Otto AI Assistant as an AWS Lambda function.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Python 3.8 or later
- PowerShell (Windows) or Bash (Linux/Mac)

## Building the Deployment Package

### On Windows:
1. Open PowerShell
2. Navigate to the `py-otto` directory
3. Run the build script:
```powershell
.\scripts\build_lambda.ps1
```

### On Linux/Mac:
1. Open Terminal
2. Navigate to the `py-otto` directory
3. Make the build script executable and run it:
```bash
chmod +x scripts/build_lambda.sh
./scripts/build_lambda.sh
```

This will create a `deployment.zip` file in your `py-otto` directory.

## Deploying to AWS Lambda

1. Create a new Lambda function:
   - Go to AWS Lambda Console
   - Click "Create function"
   - Choose "Author from scratch"
   - Name: `otto-ai-assistant`
   - Runtime: Python 3.9
   - Architecture: x86_64
   - Click "Create function"

2. Upload the deployment package:
   - In the Lambda function page
   - Click "Upload from" -> ".zip file"
   - Upload the `deployment.zip` file
   - Click "Save"

3. Configure the function:
   - Set Handler to: `app.main.handler`
   - Memory: Start with 256 MB (adjust based on usage)
   - Timeout: 30 seconds
   - Environment variables: Add any required API keys

4. Create API Gateway:
   - Click "Add trigger"
   - Select "API Gateway"
   - Create new HTTP API
   - Security: Open
   - Click "Add"

5. Update the frontend:
   - Copy the API Gateway URL
   - Update the `OTTO_API_URL` in your frontend configuration to point to the new Lambda URL

## Testing

Test the deployment by sending a POST request to your API Gateway URL:

```bash
curl -X POST https://your-api-gateway-url/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "thread_id": "test-thread"}'
```

## Monitoring

Monitor your Lambda function using AWS CloudWatch:
- View logs in CloudWatch Logs
- Set up CloudWatch Alarms for errors
- Monitor execution duration and memory usage

## Troubleshooting

Common issues:
1. Timeout errors: Increase the Lambda timeout setting
2. Memory errors: Increase allocated memory
3. Cold start latency: Consider using Provisioned Concurrency
4. Missing dependencies: Check the deployment package contents

For detailed error messages, check CloudWatch Logs. 