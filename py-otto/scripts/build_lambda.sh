#!/bin/bash

# Create a temporary directory for the package
mkdir -p build
cd build

# Create and activate a temporary virtual environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt

# Create deployment package
mkdir package
cp -r ../app package/
cp -r venv/lib/python*/site-packages/* package/

# Create zip file
cd package
zip -r ../../deployment.zip .

# Clean up
cd ../..
rm -rf build 