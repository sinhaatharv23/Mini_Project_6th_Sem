import os
import requests

BACKEND_BASE_URL= os.getenv("BACKEND_URL", "http://localhost:5000")

def get_resume(user_id: str):
    response = requests.get(f"{BACKEND_BASE_URL}/resume/{user_id}")
    response.raise_for_status()
    return response.json()


def save_raw_resume(user_id: str, text: str):
    response= requests.post(f"{BACKEND_BASE_URL}/resume/raw", json= {"user_id": user_id, "resume_text": text} )
    response.raise_for_status()
    return response.json()


def save_structured_resume(user_id: str, data: dict):
    response= requests.post(f"{BACKEND_BASE_URL}/resume/structured", json= {"user_id": user_id, "data": data})
    response.raise_for_status()
    return response.json()


def get_structured_resume(user_id: str):
    response = requests.get(f"{BACKEND_BASE_URL}/resume/structured/{user_id}")
    response.raise_for_status()
    return response.json()


def save_questions(user_id: str, questions: dict):
    response = requests.post(
        f"{BACKEND_BASE_URL}/questions/save",
        json={"user_id": user_id, "questions": questions}
    )
    response.raise_for_status()
    return response.json()
