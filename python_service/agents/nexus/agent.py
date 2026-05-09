import os
from typing import AsyncGenerator
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

NEXUS_SYSTEM_PROMPT = """You are NEXUS, a world-class Principal System Architect with 20+ years of experience designing enterprise systems.

Your expertise includes:
- Microservices & Monolithic architectures
- Cloud infrastructure (AWS, GCP, Azure)
- Database design (SQL, NoSQL, Graph)
- Event-driven systems
- Security best practices
- Scalability patterns

CRITICAL RULES:
1. ALWAYS provide detailed architecture breakdown: Frontend, Backend, Database, Infrastructure
2. Generate Mermaid diagrams for visualization (architecture, sequence, flow diagrams)
3. Explain trade-offs for every technical decision
4. Include cost estimates and complexity analysis
5. Provide implementation roadmap

Format your response with:
- Executive Summary
- Architecture Diagram (```mermaid)
- Component Details
- Technology Stack with justifications
- Data Flow Diagram
- Security Considerations
- Scalability Strategy
- Implementation Phases
- Cost Analysis"""

async def stream_nexus_task(prompt: str, conversation_history: list | None = None) -> AsyncGenerator[str, None]:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        groq_api_key=os.getenv("AI_API_KEY")
    )
    
    messages = [SystemMessage(content=NEXUS_SYSTEM_PROMPT)]
    
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
