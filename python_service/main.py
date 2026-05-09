import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Form, File, UploadFile
from typing import Optional
from sse_starlette.sse import EventSourceResponse

from agents.nexus.agent import stream_nexus_task
from agents.teacher.agent import stream_teacher_task
from agents.idunn.agent import stream_idunn_task

app = FastAPI(title="Asgard Agents Python Microservice")

@app.post("/api/execute")
async def execute_job(
    agent_id: str = Form(...),
    prompt: str = Form(...),
    job_id: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    async def event_generator():
        try:
            if agent_id == "heimdall":
                async for chunk in stream_nexus_task(prompt):
                    yield {"data": chunk}

            elif agent_id == "odin":
                if file:
                    pdf_bytes = await file.read()
                else:
                    pdf_bytes = None

                async for chunk in stream_teacher_task(prompt, pdf_bytes, job_id):
                    yield {"data": chunk}

            elif agent_id == "idunn":
                async for chunk in stream_idunn_task(prompt):
                    yield {"data": chunk}

            else:
                yield {"data": f"Error: Unknown agent '{agent_id}'. Available agents: heimdall, odin, idunn"}
                return
                
        except Exception as e:
            yield {"event": "error", "data": str(e)}

    return EventSourceResponse(event_generator())

@app.get("/api/agents")
async def list_agents():
    return {"agents": [
        {"id": "heimdall", "name": "Heimdall", "description": "Coding Agent — System Architect"},
        {"id": "odin", "name": "Odin", "description": "Studying Agent — RAG Tutor (Requires PDF)"},
        {"id": "idunn", "name": "Idunn", "description": "Cooking Agent — Recipes & Meal Plans"}
    ]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)