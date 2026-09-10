from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import ChatRequest, ChatResponse
from app.rag import retrieve_context
from app.llm import generate_answer

app = FastAPI(title="TrackFlow AI Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "TrackFlow AI Chatbot Running"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):

    # Step 1: Retrieve relevant document chunks.
    # is_public is now passed all the way down — internal-only chunks are
    # filtered out inside retrieve_context() itself (see app/retriever.py),
    # BEFORE they are ever assembled into the prompt.
    context = retrieve_context(req.question, is_public=req.is_public)

    try:
        # Step 2: Generate final answer using Gemini
        answer = generate_answer(req.question, context, is_public=req.is_public)
    except Exception as e:
        error_msg = str(e)
        print(f"Gemini API Error occurred: {error_msg}")

        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            answer = " TrackFlow AI is currently experiencing high request volumes (Gemini API rate limit exceeded). Please try again in a few seconds."
        elif "503" in error_msg or "UNAVAILABLE" in error_msg:
            answer = " The Gemini API service is temporarily unavailable. Please try again shortly."
        else:
            answer = " An unexpected error occurred while communicating with the AI service. Please try again."

    # Never return raw retrieved context to public callers — it can contain
    # internal chunks even after filtering slips (defense in depth), and
    # public clients have no legitimate reason to see raw context anyway.
    return ChatResponse(
        answer=answer,
        retrieved_context=None if req.is_public else context,
    )

