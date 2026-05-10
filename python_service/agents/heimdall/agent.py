import os
import json
import re
from typing import AsyncGenerator
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_groq import ChatGroq

HEIMDALL_SYSTEM_PROMPT = """You are HEIMDALL, the All-Seeing System Architect of Asgard. You design flawless, planetary-scale software systems.

You are a JSON engine. Output ONLY a valid JSON object with these exact fields:

{
  "project_name": "Name of the system",
  "summary": "High-level overview",
  "tech_stack": [
    { "layer": "Frontend", "tech": "React", "reason": "why chosen" }
  ],
  "components": {
    "frontend": { "framework": "React", "state": "Redux", "styling": "TailwindCSS" },
    "backend": { "runtime": "Node.js", "api": "REST", "auth": "JWT" },
    "database": { "primary": "PostgreSQL", "caching": "Redis", "search": "Elasticsearch" },
    "infrastructure": { "provider": "AWS", "ci_cd": "GitHub Actions", "monitoring": "Datadog" }
  },
  "diagram": "graph TD\\nA[Client]-->B[Gateway]\\nB-->C[Service]",
  "security": ["TLS 1.3", "OAuth 2.0"],
  "scalability": ["Horizontal scaling", "Load balancing"],
  "roadmap": [
    { "phase": "Phase 1", "tasks": ["Set up CI/CD", "Core API"] }
  ],
  "trade_offs": "Brief explanation of trade-offs made."
}

RULES:
- Use \\n (backslash + n) for line breaks in the diagram field. NEVER literal newlines.
- tech_stack layer values: exactly "Frontend", "Backend", "Database", or "Infra"
- Every field must be present with a non-empty value
- Diagram must be valid Mermaid.js syntax (graph TD, graph LR, flowchart, sequenceDiagram, etc.)"""


def extract_json(text: str) -> str:
    """Robustly extract a JSON object from LLM output."""
    text = text.strip()

    # Try direct parse first
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass

    # Try to find and extract { ... }
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end + 1]
        try:
            json.loads(candidate)
            return candidate
        except json.JSONDecodeError:
            pass
        # Clean common issues and retry
        cleaned = re.sub(r',\s*([}\]])', r'\1', candidate)
        try:
            json.loads(cleaned)
            return cleaned
        except json.JSONDecodeError:
            pass

    # Try extracting from markdown code blocks
    match = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
    if match:
        candidate = match.group(1).strip()
        try:
            json.loads(candidate)
            return candidate
        except json.JSONDecodeError:
            pass

    # Last resort: fix escaped newlines and retry
    fixed = text.replace('\n', '\\n').replace('\\n\\n', '\\n')
    start = fixed.find('{')
    end = fixed.rfind('}')
    if start != -1 and end != -1 and end > start:
        return fixed[start:end + 1]

    return text


def ensure_required_fields(data: dict) -> dict:
    """Fill in any missing required fields with defaults."""
    defaults = {
        "project_name": data.get("project_name") or "Untitled System",
        "summary": data.get("summary") or "",
        "tech_stack": data.get("tech_stack") or [],
        "components": data.get("components") or {
            "frontend": {"framework": "", "state": "", "styling": ""},
            "backend": {"runtime": "", "api": "", "auth": ""},
            "database": {"primary": "", "caching": "", "search": ""},
            "infrastructure": {"provider": "", "ci_cd": "", "monitoring": ""},
        },
        "diagram": data.get("diagram") or "",
        "security": data.get("security") or [],
        "scalability": data.get("scalability") or [],
        "roadmap": data.get("roadmap") or [],
        "trade_offs": data.get("trade_offs") or data.get("tradeoffs") or "",
    }
    return defaults


async def stream_heimdall_task(prompt: str, conversation_history: list | None = None) -> AsyncGenerator[str, None]:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        groq_api_key=os.getenv("AI_API_KEY"),
    )

    messages = [SystemMessage(content=HEIMDALL_SYSTEM_PROMPT)]

    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant" or role == "ai":
                messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=prompt))

    # Collect full response, validate JSON, then yield the clean result
    full_response = ""
    async for chunk in llm.astream(messages):
        if chunk.content:
            full_response += chunk.content

    if full_response:
        extracted = extract_json(full_response)
        try:
            data = json.loads(extracted)
            data = ensure_required_fields(data)
            # Convert \n to actual newlines in diagram for Mermaid rendering
            if data["diagram"]:
                data["diagram"] = data["diagram"].replace("\\n", "\n")
            clean = json.dumps(data)
            yield clean
        except json.JSONDecodeError:
            clean = json.dumps({
                "project_name": "Parsing Error",
                "summary": "Heimdall returned an unparseable response. Please try again.",
                "tech_stack": [],
                "components": {
                    "frontend": {"framework": "", "state": "", "styling": ""},
                    "backend": {"runtime": "", "api": "", "auth": ""},
                    "database": {"primary": "", "caching": "", "search": ""},
                    "infrastructure": {"provider": "", "ci_cd": "", "monitoring": ""},
                },
                "diagram": "",
                "security": [],
                "scalability": [],
                "roadmap": [],
                "trade_offs": "",
                "_raw": full_response[:2000],
            })
            yield clean
