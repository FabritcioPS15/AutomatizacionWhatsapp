import asyncio
import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from whatsapp import WhatsAppAutomation, SendItem, SendJob, JobManager

app = FastAPI(title="WA Local Sender", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

wa = WhatsAppAutomation()
job_manager = JobManager(wa)


class ImagePayload(BaseModel):
    dataUrl: str = Field(..., description="Data URL base64 de la imagen")

class OutMessage(BaseModel):
    to: str
    text: str
    image: Optional[ImagePayload] = None

class SendRequest(BaseModel):
    messages: List[OutMessage]
    delaySeconds: int = 5

class SendResponse(BaseModel):
    jobId: str

class JobControl(BaseModel):
    jobId: str

class ProgressResponse(BaseModel):
    total: int
    sent: int
    failed: int
    paused: bool
    running: bool
    lastError: Optional[str] = None


@app.on_event("startup")
async def _startup():
    await wa.start()

@app.on_event("shutdown")
async def _shutdown():
    await wa.stop()

@app.get("/status")
async def status():
    logged = await wa.is_logged_in()
    running = any(j.running for j in job_manager.jobs.values())
    return {"logged_in": logged, "queue_size": len(job_manager.jobs), "running": running}

@app.get("/login-qr")
async def login_qr():
    qr = await wa.get_login_qr()
    if not qr:
        raise HTTPException(status_code=404, detail="QR no disponible")
    return {"qr_data_url": qr}

@app.post("/send", response_model=SendResponse)
async def send(req: SendRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="No hay mensajes para enviar")
    job_id = str(uuid.uuid4())
    items = [SendItem(to=m.to, text=m.text, image_data_url=m.image.dataUrl if m.image else None) for m in req.messages]
    job = SendJob(id=job_id, items=items, delay_seconds=max(0, req.delaySeconds))
    await job_manager.create_and_run(job)
    return SendResponse(jobId=job_id)

@app.get("/progress", response_model=ProgressResponse)
async def progress(jobId: str):
    job = job_manager.get(jobId)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return ProgressResponse(
        total=len(job.items),
        sent=job.sent,
        failed=job.failed,
        paused=job.paused,
        running=job.running,
        lastError=job.last_error,
    )

@app.post("/pause")
async def pause(ctrl: JobControl):
    job_manager.pause(ctrl.jobId)
    return {"ok": True}

@app.post("/resume")
async def resume(ctrl: JobControl):
    job_manager.resume(ctrl.jobId)
    return {"ok": True}

@app.post("/cancel")
async def cancel(ctrl: JobControl):
    job_manager.cancel(ctrl.jobId)
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
