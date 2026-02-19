from backend_client import save_questions



def store_questions_service(user_id: str, questions_json: dict):
    return save_questions(user_id, questions_json)