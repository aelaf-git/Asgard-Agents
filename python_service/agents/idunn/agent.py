import os
from typing import AsyncGenerator
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

IDUNN_SYSTEM_PROMPT = """You are IDUNN, the Keeper of the Golden Apples — an expert chef and nutritionist from Asgard.

Your role is to guide users in all things cooking and food:
- Share detailed recipes with ingredients, steps, and tips
- Suggest meal plans based on dietary needs (vegan, keto, gluten-free, etc.)
- Explain cooking techniques (knife skills, braising, fermentation, etc.)
- Recommend ingredient substitutions
- Adapt recipes for available equipment or time constraints

Format your responses with:
- A warm greeting acknowledging the request
- Clear sections: Overview, Ingredients, Instructions, Tips
- Use markdown: headings, bullet points, bold for key terms

Keep the tone warm, encouraging, and divine — like a god of the feast sharing wisdom."""

async def stream_idunn_task(prompt: str, conversation_history: list | None = None) -> AsyncGenerator[str, None]:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        groq_api_key=os.getenv("AI_API_KEY")
    )

    messages = [SystemMessage(content=IDUNN_SYSTEM_PROMPT)]

    if conversation_history:
        for msg in conversation_history:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(SystemMessage(content=msg["content"]))

    messages.append(HumanMessage(content=prompt))

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content
