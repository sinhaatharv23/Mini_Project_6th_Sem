import os

from google.adk.agents import Agent


import warnings
warnings.filterwarnings("ignore") # filter all warnings
import logging
logging.basicConfig(level= logging.INFO)

from dotenv import load_dotenv
from pathlib import Path

print("Libraries Imported")

from tools import *


# --> GOOGLE API KEY <--
BASE_DIR = Path(__file__).resolve().parent
env_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=env_path)
print("API Keys Set:")

MODEL_GEMINI_2_5_FLASH = "gemini-2.5-flash"
AGENT_MODEL = MODEL_GEMINI_2_5_FLASH


root_agent= Agent(
    name= "root_orchestrator_agent",
    model= AGENT_MODEL,
    description="Coordinates resume retrieval, extraction, and questionnaire workflows with direct execution.",
    instruction=(
        "You are a workflow orchestrator that directly executes all steps without delegating to sub-agents.\n\n"
        "WORKFLOW A (Resume Analysis - When you receive 'process_resume' action):\n"
        "CRITICAL - Follow these steps EXACTLY in order:\n"
        "1. Extract the user_id from the input message.\n"
        "2. CHECK if 'resume_text_content' is provided in the input message.\n"
        "   - IF YES: Use it as the resume text.\n"
        "   - IF NO: Call get_resume tool with the user_id to fetch the raw resume text.\n"
        "3. Extract and structure the resume information into the JSON format.\n"
        "4. Call save_structured_resume with user_id and the extracted structured JSON.\n"
        "5. FINAL OUTPUT: Return ONLY the structured JSON with exactly these keys: 'skills', 'projects', 'experience'.\n"
        "6. Structure must include:\n"
        "   - skills: array of objects with 'category' and 'items'\n"
        "   - projects: array of objects with 'title', 'description', 'technologies', 'impact'\n"
        "   - experience: array of objects with 'role', 'company', 'duration', 'responsibilities'\n"
        "7. Never return raw resume text. Return ONLY the structured JSON.\n\n"
        "WORKFLOW B (Question Generation - When you receive 'generate_questions' action OR 'questions'/'interview' keywords):\n"
        "1. Extract the user_id from the input.\n"
        "2. Call fetch_structured_resume with the user_id to get the structured resume data.\n"
        "3. Generate exactly 6 excellent interview questions based on skills, projects, and experience.\n"
        "4. For each question, provide a comprehensive, detailed answer (100-200 words).\n"
        "5. Call save_questions with user_id and your generated questions in JSON format.\n"
        "6. FINAL OUTPUT: Return ONLY the questions JSON.\n\n"
        "JSON STRUCTURE FOR WORKFLOW B:\n"
        "{\n"
        '  "questions": [\n'
        "    {\n"
        '      "section": "skills",\n'
        '      "question": "Your question text here",\n'
        '      "answer": "Your answer text here"\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "OUTPUT RULES:\n"
        "- For Workflow A: Return ONLY valid JSON with skills, projects, experience keys.\n"
        "- For Workflow B: Return ONLY valid JSON with questions array.\n"
        "- Never return raw resume text.\n"
        "- Never add explanations, markdown, or code blocks.\n"
        "- Return ONLY valid, parseable JSON.\n"
    ),

    tools= [get_resume, save_structured_resume, fetch_structured_resume, save_questions]
)
print("Ran root agent")
