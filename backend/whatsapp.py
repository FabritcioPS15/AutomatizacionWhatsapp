import asyncio
import os
from typing import List, Optional
from dataclasses import dataclass, field
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

USER_DATA_DIR = os.path.join(os.path.dirname(__file__), ".pw-session")
START_URL = "https://web.whatsapp.com/"

@dataclass
class SendItem:
    to: str
    text: str
    image_data_url: Optional[str] = None

@dataclass
class SendJob:
    id: str
    items: List[SendItem]
    delay_seconds: int
    sent: int = 0
    failed: int = 0
    running: bool = False
    paused: bool = False
    cancelled: bool = False
    last_error: Optional[str] = None

class WhatsAppAutomation:
    def __init__(self):
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._lock = asyncio.Lock()

    async def start(self):
        if self._context:
            return
        self._playwright = await async_playwright().start()
        headless_env = os.getenv("WA_HEADLESS", "1").lower()
        headless = headless_env in ("1", "true", "yes", "on")
        self._context = await self._playwright.chromium.launch_persistent_context(
            USER_DATA_DIR,
            headless=headless,
            viewport={"width": 1366, "height": 900}
        )
        self._page = await self._context.new_page()
        await self._page.goto(START_URL)

    async def stop(self):
        try:
            if self._context:
                await self._context.close()
            if self._browser:
                await self._browser.close()
        finally:
            if self._playwright:
                await self._playwright.stop()
            self._playwright = None
            self._browser = None
            self._context = None
            self._page = None

    async def is_logged_in(self) -> bool:
        if not self._page:
            return False
        # Heurística: si existe el buscador de chats o caja de mensaje, asumimos login
        try:
            await self._page.wait_for_selector('[data-testid="chat-list-search"]', timeout=500)
            return True
        except Exception:
            pass
        try:
            await self._page.wait_for_selector('div[contenteditable="true"][data-tab="10"]', timeout=500)
            return True
        except Exception:
            return False

    async def get_login_qr(self) -> Optional[str]:
        if not self._page:
            return None
        # Captura región del QR si existe; como fallback, screenshot de toda la pantalla
        try:
            qr = await self._page.wait_for_selector('canvas[aria-label="Scan me!"]', timeout=2000)
            b64 = await qr.screenshot(timeout=2000)
            import base64
            return "data:image/png;base64," + base64.b64encode(b64).decode("utf-8")
        except Exception:
            try:
                png = await self._page.screenshot()
                import base64
                return "data:image/png;base64," + base64.b64encode(png).decode("utf-8")
            except Exception:
                return None

    async def _ensure_ready(self):
        if not self._context:
            await self.start()

    async def _open_chat_and_send_text(self, to: str, text: str):
        assert self._page
        # Abrir chat directo via URL con texto prellenado
        import urllib.parse
        url = f"https://web.whatsapp.com/send?phone={to}&text={urllib.parse.quote(text)}"
        await self._page.goto(url)
        # Esperar caja de mensaje
        await self._page.wait_for_selector('div[contenteditable="true"][data-tab="10"]', timeout=20000)
        # Enviar (Enter)
        await self._page.keyboard.press('Enter')
        # Esperar que el mensaje aparezca en el DOM (una heurística)
        await self._page.wait_for_timeout(1000)

    async def send_batch(self, job: SendJob):
        async with self._lock:
            await self._ensure_ready()
        # Verificar login antes de iniciar
        if not await self.is_logged_in():
            job.last_error = "No logueado en WhatsApp Web. Escanea el QR."
            return
        job.running = True
        for idx, it in enumerate(job.items):
            if job.cancelled:
                job.running = False
                return
            while job.paused and not job.cancelled:
                await asyncio.sleep(0.3)
            try:
                await self._open_chat_and_send_text(it.to, it.text)
                job.sent += 1
            except Exception as e:
                job.failed += 1
                job.last_error = str(e)
            await asyncio.sleep(max(0, job.delay_seconds))
        job.running = False

# Gestor de trabajos simple en memoria
class JobManager:
    def __init__(self, wa: WhatsAppAutomation):
        self.wa = wa
        self.jobs: dict[str, SendJob] = {}
        self.tasks: dict[str, asyncio.Task] = {}

    def get(self, job_id: str) -> Optional[SendJob]:
        return self.jobs.get(job_id)

    async def create_and_run(self, job: SendJob):
        self.jobs[job.id] = job
        self.tasks[job.id] = asyncio.create_task(self.wa.send_batch(job))
        return job.id

    def pause(self, job_id: str):
        j = self.get(job_id)
        if j:
            j.paused = True

    def resume(self, job_id: str):
        j = self.get(job_id)
        if j:
            j.paused = False

    def cancel(self, job_id: str):
        j = self.get(job_id)
        if j:
            j.cancelled = True
