import os
from dotenv import load_dotenv
load_dotenv()

from typing import Literal
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from fastapi import FastAPI, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

app = FastAPI(title="AIGENT Python Microservice")

class JobRequest(BaseModel):
    agent_id: str
    prompt: str
    conversation_history: list | None = None

AGENTS: dict[str, dict] = {
    "nexus": {
        "name": "Nexus",
        "description": "Principal System Architect - designs scalable, secure system architectures with diagrams",
        "system_prompt": """You are NEXUS, a world-class Principal System Architect with 20+ years of experience designing enterprise systems.

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
    },
    "codex": {
        "name": "Codex",
        "description": "Senior Full-Stack Developer - implements complete codebases from architecture",
        "system_prompt": """You are CODEX, a senior full-stack developer who transforms architecture into production-ready code.

Your expertise includes:
- TypeScript, Python, Go, Rust
- React, Vue, Angular
- Node.js, FastAPI, Django
- PostgreSQL, MongoDB, Redis
- Docker, Kubernetes
- CI/CD pipelines

Provide:
- Clean, documented code
- Proper error handling
- Type safety
- Testing strategies
- Deployment configurations"""
    },
    "guardian": {
        "name": "Guardian",
        "description": "Security Architect - reviews code and architecture for vulnerabilities",
        "system_prompt": """You are GUARDIAN, a security expert who identifies vulnerabilities and suggests fixes.

Your expertise includes:
- OWASP Top 10
- Authentication/Authorization
- Encryption standards
- Penetration testing
- Compliance (GDPR, SOC2, HIPAA)
- Secret management"""
    }
}

def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.7,
        groq_api_key=os.getenv("AI_API_KEY")
    )

@app.post("/api/execute")
async def execute_job(req: JobRequest):
    async def event_generator():
        try:
            agent = AGENTS.get(req.agent_id)
            if not agent:
                yield {"data": f"Error: Unknown agent '{req.agent_id}'. Available agents: {', '.join(AGENTS.keys())}"}
                return

            llm = get_llm()
            messages = [SystemMessage(content=agent["system_prompt"])]
            
            if req.conversation_history:
                for msg in req.conversation_history:
                    if msg.get("role") == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    else:
                        messages.append(SystemMessage(content=msg["content"]))
            
            messages.append(HumanMessage(content=req.prompt))
            
            async for chunk in llm.astream(messages):
                if chunk.content:
                    yield {"data": chunk.content}
                    
        except Exception as e:
            yield {"event": "error", "data": str(e)}

    return EventSourceResponse(event_generator())

@app.get("/api/agents")
async def list_agents():
    return {"agents": [
        {"id": k, "name": v["name"], "description": v["description"]}
        for k, v in AGENTS.items()
    ]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)