from backend_client import save_structured_resume, get_structured_resume



def store_structured_resume_service(user_id: str, structured_json: dict):
    return save_structured_resume(user_id, structured_json)


def fetch_structured_resume_service(user_id: str):
    return get_structured_resume(user_id)