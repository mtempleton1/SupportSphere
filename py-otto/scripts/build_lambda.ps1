# Create a temporary directory for the package
New-Item -ItemType Directory -Force -Path build
Set-Location build

# Create and activate a temporary virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r ..\requirements.txt

# Create deployment package
New-Item -ItemType Directory -Force -Path package
Copy-Item -Path ..\app -Destination package -Recurse
Copy-Item -Path venv\Lib\site-packages\* -Destination package -Recurse

# Create zip file
Compress-Archive -Path package\* -DestinationPath ..\deployment.zip -Force

# Clean up
Set-Location ..
Remove-Item -Path build -Recurse -Force 