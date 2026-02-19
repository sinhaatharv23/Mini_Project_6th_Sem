from backend_client import get_resume, save_raw_resume


def fetch_resume_service(user_id: str) -> str:
    data= get_resume(user_id)

    if "resume_text" not in data:
        raise ValueError("Resume text missing from backend response")
    
    return data["resume_text"]


def store_raw_resume_service(user_id: str, text: str):
    return save_raw_resume(user_id, text)