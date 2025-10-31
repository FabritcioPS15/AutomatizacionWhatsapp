# WhatsApp Bot - Ejecución Local (Frontend + Backend)

Esta guía explica cómo ejecutar el frontend (React) y el backend (Python + FastAPI + Playwright) en Windows para automatizar envíos por WhatsApp Web sin costos.

## Requisitos
- Windows 10/11
- Python 3.10 o superior (agregado al PATH)
- Node.js 18+ (con npm o pnpm/yarn)

---

## 1) Backend (Python + FastAPI + Playwright)

Ubicación: `backend/`

Opción rápida Windows (doble clic):

- Ejecuta `backend/start_backend.bat`. Este script:
  - Crea `.venv` si no existe.
  - Instala dependencias y Playwright.
  - Arranca el servidor en `http://localhost:8000`.

Opción manual:

1. Abrir PowerShell en la carpeta `backend/`.
2. Crear y activar un entorno virtual:
   - Crear venv:
     ```powershell
     python -m venv .venv
     ```
   - Activar venv:
     ```powershell
     .venv\Scripts\activate
     ```
3. Instalar dependencias:
   ```powershell
   pip install -r requirements.txt
   ```
4. Instalar browsers para Playwright (una sola vez):
   ```powershell
   python -m playwright install
   ```
5. Iniciar el servidor FastAPI (puerto 8000):
   ```powershell
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

Notas:
- Al iniciar, Playwright abrirá una ventana de Chromium con WhatsApp Web.
- Si no estás logueado, desde el frontend puedes pedir el QR (o escanear el que aparezca en la ventana).
- La sesión queda guardada localmente (carpeta `backend/.pw-session/`).

Endpoints útiles (el frontend ya los usa):
- `GET http://localhost:8000/status`
- `GET http://localhost:8000/login-qr`
- `POST http://localhost:8000/send`
- `GET http://localhost:8000/progress?jobId=...`
- `POST http://localhost:8000/pause` | `POST http://localhost:8000/resume` | `POST http://localhost:8000/cancel`

---

## 2) Frontend (React)

Ubicación: `src/` (proyecto React en la raíz `project/`)

1. Abrir otra ventana de PowerShell en la carpeta raíz del proyecto (donde está `package.json`).
2. Instalar dependencias (si aplica):
   ```powershell
   npm install
   ```
3. Ejecutar el servidor de desarrollo:
   ```powershell
   npm run dev
   ```
4. Abrir el navegador en la URL que muestre el comando (ej: `http://localhost:5173` si usas Vite).

---

## 3) Flujo de uso

1. Ir a la sección **Subir Datos** y cargar el Excel/CSV con contactos.
2. Ir a **Mensaje**:
   - Escribir el mensaje usando variables: `{{Header}}`, `{{nombre}}`, `{{telefono}}`.
   - Si el backend no está logueado, presiona **Mostrar QR de inicio de sesión** y escanéalo.
   - Ajusta el **Delay entre mensajes (seg)** (recomendado >= 5s).
   - Presiona **Iniciar Envío**.
   - Usa **Pausar, Reanudar, Cancelar** según necesites.

Notas de teléfonos (Perú):
- Los números se normalizan a formato Perú: si no incluyen código, se antepone `51` cuando tiene 9 dígitos. Se eliminan prefijos `00`/`0`.

---

## 4) Solución de problemas

- "QR no disponible" en frontend:
  - Asegúrate que el backend esté ejecutándose (`uvicorn` activo) y vuelve a intentar.
- El estado muestra "No conectado":
  - Haz clic en **Mostrar QR de inicio de sesión** y escanea el QR desde la app WhatsApp del teléfono.
- Error de cuota de navegador al guardar snapshot:
  - Se guarda un snapshot ligero de hasta 300 filas en `localStorage`. Si tu archivo es muy grande, la restauración tras recarga puede no estar disponible, pero el estado entre menús se mantiene por contexto.
- Playwright no abre Chromium:
  - Repite `python -m playwright install`, y asegúrate de que el entorno virtual está activado.

---

## 5) Comandos rápidos (resumen)

Backend:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install
uvicorn main:app --host 0.0.0.0 --port 8000
```

Frontend:
```powershell
npm install
npm run dev
```

---

## 6) Estructura relevante

```
project/
├─ backend/
│  ├─ main.py                # FastAPI: endpoints
│  ├─ whatsapp.py            # Lógica Playwright
│  ├─ requirements.txt       # Dependencias Python
│  └─ .pw-session/           # (autogenerado) sesión WhatsApp Web
├─ src/
│  ├─ components/
│  │  ├─ UploadSection.tsx   # Carga archivo y persiste en contexto
│  │  └─ MessageSection.tsx  # Vista previa, QR, envío y progreso
│  ├─ context/
│  │  └─ UploadDataContext.tsx
│  └─ App.tsx
└─ README.md
```

---

## 7) Buenas prácticas
- Mantén un **delay** razonable para evitar bloqueos.
- Evita enviar grandes volúmenes en poco tiempo.
- Verifica que el número de teléfono tenga el formato correcto.
- No cierres la ventana de Chromium mientras se envían mensajes.
