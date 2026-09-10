from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    question: str
    tenant_id: Optional[int] = None
    history: Optional[List[dict]] = []
    is_public: Optional[bool] = False


class ChatResponse(BaseModel):
    answer: str
    # Only populated for internal/debug calls — never sent to public clients,
    # since it can contain raw source-code chunks. See main.py.
    retrieved_context: Optional[str] = None
