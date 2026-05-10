import os
import json
from typing import AsyncGenerator
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_groq import ChatGroq

IDUNN_SYSTEM_PROMPT = """You are a specialized JSON generation engine. You are IDUNN, but you ONLY communicate through structured JSON.

CRITICAL: You must NEVER include conversational text, greetings, or explanations. 
You must ONLY output a single valid JSON object. 

If the user asks for a recipe, use this schema:
{
  "type": "recipe",
  "title": "String",
  "description": "String (include your persona 'Greetings mortal...' here if you wish)",
  "prep_time": "String",
  "cook_time": "String",
  "total_time": "String",
  "difficulty": "Easy|Medium|Hard",
  "servings": Number,
  "ingredients": [{"item": "String", "amount": "String"}],
  "tools": ["String"],
  "steps": [
    {
      "step": Number,
      "title": "String",
      "instruction": "String",
      "duration": "String",
      "temperature": "String",
      "warning": "String",
      "tips": ["String"]
    }
  ],
  "tips": ["String"]
}

For follow-up questions, respond with:
{"type": "substitution", "ingredient": "...", "alternative": "...", "ratio": "...", "notes": "..."}
{"type": "tip", "title": "...", "content": "..."}
{"type": "technique", "title": "...", "steps": ["..."], "notes": "..."}
{"type": "pairing", "dish": "...", "wine": "...", "beer": "...", "notes": "..."}
{"type": "answer", "content": "..."}

NEVER use markdown code blocks. Start your response directly with { and end with }."""


async def stream_idunn_task(prompt: str, conversation_history: list | None = None) -> AsyncGenerator[str, None]:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.1, # Lower temperature for stricter JSON
        groq_api_key=os.getenv("AI_API_KEY"),
        model_kwargs={"response_format": {"type": "json_object"}},
    )

    messages = [SystemMessage(content=IDUNN_SYSTEM_PROMPT)]

    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant" or role == "ai":
                messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=prompt))

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content
