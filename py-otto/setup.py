from setuptools import setup, find_packages

setup(
    name="py-otto",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "langgraph>=0.0.15",
        "langserve>=0.0.33",
        "langchain-anthropic>=0.1.1",
        "python-dotenv>=1.0.0",
        "fastapi>=0.109.0",
        "uvicorn>=0.27.0",
        "pydantic>=2.5.3"
    ],
) 