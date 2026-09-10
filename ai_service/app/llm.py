from google import genai

from app.config import GEMINI_API_KEY, GEMINI_MODEL


client = genai.Client(api_key=GEMINI_API_KEY)


PUBLIC_FALLBACK_MESSAGE = (
    "I don't have enough information about that in the current "
    "TrackFlow knowledge to answer this accurately."
)

INTERNAL_FALLBACK_MESSAGE = (
    "I don't have enough information about that in the current "
    "project knowledge."
)


def generate_answer(
    question: str,
    context: str,
    history: list | None = None,
    is_public: bool = False,
) -> str:
    """
    Generate a context-grounded answer for the TrackFlow AI chatbot.

    Args:
        question: Current user question.
        context: Relevant context retrieved from the RAG pipeline.
        history: Previous conversation history.
        is_public: Whether the user is using the public/business chatbot.

    Returns:
        A generated answer grounded only in the supplied context.
    """

    history_text = format_history(history)

    prompt = build_prompt(
        question=question,
        context=context,
        history_text=history_text,
        is_public=is_public,
    )

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )

        answer = getattr(response, "text", None)

        if not answer or not answer.strip():
            return (
                PUBLIC_FALLBACK_MESSAGE
                if is_public
                else INTERNAL_FALLBACK_MESSAGE
            )

        return answer.strip()

    except Exception as exc:
        # Log properly later using Python logging
        print(f"LLM generation error: {exc}")

        return (
            "I'm sorry, I'm unable to process your request right now. "
            "Please try again later."
        )


def build_prompt(
    question: str,
    context: str,
    history_text: str,
    is_public: bool,
) -> str:
    """
    Build the prompt based on chatbot access type.
    """

    fallback_message = (
        PUBLIC_FALLBACK_MESSAGE
        if is_public
        else INTERNAL_FALLBACK_MESSAGE
    )

    if is_public:
        role_instructions = """
You are TrackFlow AI, the public-facing onboarding and business guide
for the TrackFlow logistics platform.

Your purpose is to help users understand:
- What TrackFlow AI is
- General platform capabilities
- User roles and responsibilities
- Registration and onboarding
- General business and operational workflows
- How users can use the platform from a non-technical perspective

SECURITY AND RESPONSE RULES:
1. Answer only using the supplied context.
2. Do not invent information.
3. Do not reveal source code, database schemas, internal APIs, internal
   services, class names, method names, file paths, environment variables,
   credentials, or other implementation details.
4. Do not explain internal architecture or provide programming instructions.
5. If a technical question can be answered from a business perspective,
   explain it in simple business terms.
6. Do not claim that a feature exists unless it is supported by the context.
7. Keep answers clear, professional, and helpful.
"""

    else:
        role_instructions = """
You are TrackFlow AI, an internal project knowledge assistant for the
TrackFlow logistics platform.

Your purpose is to answer questions about the TrackFlow project using
only the supplied context.

RESPONSE RULES:
1. Answer only from the supplied context.
2. Do not invent implementation details, features, APIs, workflows,
   permissions, or technical behavior.
3. You may explain technical concepts when they are supported by the context.
4. Prefer explaining how TrackFlow actually works rather than providing
   unrelated generic examples.
5. If the context does not contain enough information, use the exact
   fallback response provided below.
6. Keep answers clear, accurate, and appropriately detailed.
"""

    history_section = ""
    if history_text:
        history_section = f"""
PREVIOUS CONVERSATION:
{history_text}
"""

    return f"""
{role_instructions}

FALLBACK RESPONSE:
If the answer cannot be determined from the supplied context, respond
exactly with:

"{fallback_message}"

{history_section}

RETRIEVED CONTEXT:
--- START CONTEXT ---
{context}
--- END CONTEXT ---

CURRENT QUESTION:
{question}

ANSWER:
"""


def format_history(history: list | None) -> str:
    """
    Convert completed conversation history into prompt text.

    Expected format:
    [
        {
            "question": "...",
            "answer": "..."
        }
    ]
    """

    if not history:
        return ""

    lines = []

    for item in history:
        question = item.get("question", "").strip()
        answer = item.get("answer", "").strip()

        if not question or not answer:
            continue

        lines.append(f"User: {question}")
        lines.append(f"Assistant: {answer}")

    return "\n".join(lines)

