
from fastapi import FastAPI
from pydantic import BaseModel
import json
import re

from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai.types import Content, Part
from agent import root_agent

# Import services for direct pipeline control
from resume_service import fetch_resume_service, store_raw_resume_service
from extraction_service import store_structured_resume_service, fetch_structured_resume_service

from build_logger import get_logger
logger= get_logger(__name__)

app= FastAPI()

class ResumeRequest(BaseModel):
    user_id: str
    resume_text: str | None = None


def extract_json_from_text(text: str) -> dict:
    """Extract and parse JSON from text that may contain additional content."""
    if not text:
        raise ValueError("Empty text")
    
    # First, try direct parsing
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON block in the text using regex
    # Look for { ... } pattern
    json_pattern = r'\{[\s\S]*\}'
    matches = re.findall(json_pattern, text)
    
    if matches:
        # Try each match from longest to shortest (most complete first)
        for match in sorted(matches, key=len, reverse=True):
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue
    
    # If no JSON found, raise error with helpful message
    raise ValueError(f"No valid JSON found in response. Text: {text[:200]}...")



@app.post("/process_resume")
async def process_resume(request: ResumeRequest):
    try:
        logger.info(f"Starting Resume extraction process for user: {request.user_id}")

        session_service = InMemorySessionService()

        await session_service.create_session(
            app_name="resume_ai_service",
            user_id=request.user_id,
            session_id="default"
        )

        runner = Runner(
            app_name="resume_ai_service",
            agent=root_agent,
            session_service=session_service
        )

        final_text = None
        logger.info("Invoking root_agent for Workflow A (resume analysis)")

        # Prepare context - pass resume text if available to avoid redundant tool call
        context_data = {
            "workflow": "A",
            "action": "process_resume",
            "user_id": request.user_id
        }
        
        if request.resume_text:
            context_data["resume_text_content"] = request.resume_text
            logger.info("Resume text provided directly in request.")
        
        async for event in runner.run_async(
            user_id=request.user_id,
            session_id="default",
            new_message=Content(
                parts=[
                    Part(
                        text=json.dumps(context_data)
                    )
                ]
            )
        ):
            logger.debug(f"Event received: {type(event)}, has content: {hasattr(event, 'content')}")
            
            if event is None:
                logger.warning("Received None event")
                continue
                
            if not hasattr(event, 'content'):
                logger.warning(f"Event has no content attribute: {event}")
                continue
                
            if event.content is None:
                logger.debug("Event content is None")
                continue
                
            if not hasattr(event.content, 'parts') or event.content.parts is None:
                logger.debug("Event content has no parts or parts is None")
                continue
                
            if len(event.content.parts) == 0:
                logger.debug("Event content parts is empty")
                continue
            
            part = event.content.parts[0]
            if hasattr(part, 'text') and part.text is not None:
                final_text = part.text
                logger.debug(f"Received event text ({len(final_text)} chars)")
            else:
                logger.debug("Part has no text attribute or text is None")

        if final_text is None:
            logger.error("No response received from agent")
            # Fallback: Directly fetch structured resume data
            logger.info("Attempting fallback: fetching structured resume directly")
            try:
                structured_data = fetch_structured_resume_service(request.user_id)
                logger.info("Successfully retrieved structured resume via fallback")
                return structured_data
            except Exception as fallback_error:
                logger.error(f"Fallback also failed: {fallback_error}")
                return {"status": "error", "message": "No response from agent and fallback failed"}

        logger.info("Processing final response from agent")
        
        # Check if response is raw resume text (not structured) 
        is_json_structured = final_text.strip().startswith("{") and '"skills"' in final_text
        is_raw_resume = len(final_text) > 500 and not final_text.strip().startswith("{")
        
        if is_raw_resume and not is_json_structured:
            logger.warning("Response appears to be raw resume text, not structured JSON. Using fallback.")
            try:
                # Fallback: fetch structured resume
                structured_data = fetch_structured_resume_service(request.user_id)
                logger.info("Successfully retrieved structured resume via fallback")
                return structured_data
            except Exception as fallback_error:
                logger.error(f"Fallback failed: {fallback_error}")
                return {"status": "error", "message": f"Agent returned raw text and fallback failed: {str(fallback_error)}"}
        
        try:
            # Try to extract and parse JSON
            structured_output = extract_json_from_text(final_text)
            
            # Validate that output has expected keys
            if not all(key in structured_output for key in ['skills', 'projects', 'experience']):
                logger.error(f"Structured output missing required keys. Got: {list(structured_output.keys())}")
                # Try fallback
                try:
                    structured_data = fetch_structured_resume_service(request.user_id)
                    logger.info("Retrieved structured resume via fallback due to missing keys")
                    return structured_data
                except Exception as e:
                    return {"status": "error", "message": "Invalid structured output and fallback failed"}
            
            logger.info("Successfully parsed structured resume with all required sections")
            return structured_output
        except (json.JSONDecodeError, ValueError) as je:
            logger.error(f"Failed to parse JSON: {je}")
            logger.error(f"Response text: {final_text[:500]}")
            # Try fallback
            try:
                structured_data = fetch_structured_resume_service(request.user_id)
                logger.info("Retrieved structured resume via fallback due to JSON parse error")
                return structured_data
            except Exception as fallback_error:
                return {"status": "error", "message": f"Invalid JSON and fallback failed: {str(je)}", "raw_response": final_text[:500]}


    except Exception as e:
        logger.exception(f"Error in process_resume: {e}")
        return {"status": "error", "message": str(e)}



@app.post("/generate_questions")
async def generate_questions(request: ResumeRequest):
    try:
        logger.info(f"Starting question generation process for user: {request.user_id}")
        
        session_service = InMemorySessionService()

        await session_service.create_session(
            app_name="question_ai_service",
            user_id=request.user_id,
            session_id="default"
        )

        runner = Runner(
            app_name="question_ai_service",
            agent=root_agent,
            session_service=session_service
        )

        final_text = None
        logger.info("Invoking root_agent for Workflow B (question generation)")

        async for event in runner.run_async(
            user_id=request.user_id,
            session_id="default",
            new_message=Content(
                parts=[
                    Part(
                        text=f"""
                        {{
                            "workflow": "B",
                            "action": "generate_questions",
                            "user_id": "{request.user_id}"
                        }}
                        """
                    )
                ]
            )
        ):
            logger.debug(f"Event received: {type(event)}, has content: {hasattr(event, 'content')}")
            
            if event is None:
                logger.warning("Received None event")
                continue
                
            if not hasattr(event, 'content'):
                logger.warning(f"Event has no content attribute: {event}")
                continue
                
            if event.content is None:
                logger.debug("Event content is None")
                continue
                
            if not hasattr(event.content, 'parts') or event.content.parts is None:
                logger.debug("Event content has no parts or parts is None")
                continue
                
            if len(event.content.parts) == 0:
                logger.debug("Event content parts is empty")
                continue
            
            part = event.content.parts[0]
            if hasattr(part, 'text') and part.text is not None:
                final_text = part.text
                logger.debug(f"Received event text ({len(final_text)} chars)")
            else:
                logger.debug("Part has no text attribute or text is None")

        if final_text is None:
            logger.error("No response received from agent")
            return {"status": "error", "message": "No response from agent"}

        logger.info("Processing final response from agent")
        
        try:
            # Try to extract and parse JSON
            questions_output = extract_json_from_text(final_text)
            logger.info("Successfully parsed questions from agent")
            return questions_output
        except (json.JSONDecodeError, ValueError) as je:
            logger.error(f"Failed to parse JSON: {je}")
            logger.error(f"Response text: {final_text[:500]}")
            return {"status": "error", "message": f"Invalid JSON returned by questionnaire_agent: {str(je)}", "raw_response": final_text[:1000]}
            
    except Exception as e:
        logger.exception(f"Error in generate_questions: {e}")
        return {"status": "error", "message": str(e)}