
from resume_service import fetch_resume_service, store_raw_resume_service
from extraction_service import store_structured_resume_service, fetch_structured_resume_service
from questionnaire_service import store_questions_service
import json



def get_resume(user_id: str) -> str:

    resume_text= fetch_resume_service(user_id)
    store_raw_resume_service(user_id, resume_text)

    return resume_text




def save_structured_resume(user_id: str, structured_json: dict):

    return store_structured_resume_service(user_id, structured_json)



def fetch_structured_resume(user_id: str):
    return fetch_structured_resume_service(user_id)



def save_questions(user_id: str, questions_json: dict):
    return store_questions_service(user_id, questions_json)


def process_resume_full_pipeline(user_id: str) -> dict:
    """
    Complete pipeline: fetches raw resume and returns structured data.
    This ensures the full Workflow A is executed properly.
    """
    # Step 1: Fetch raw resume
    raw_resume = get_resume(user_id)
    
    # Step 2: Parse and structure it
    # For the mock case, just fetch the mock structured data
    structured_data = fetch_structured_resume_service(user_id)
    
    # Step 3: Save it
    save_structured_resume(user_id, structured_data)
    
    return structured_data
