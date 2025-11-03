FROM python:3.11-slim

# Sistema: dependencias para Chromium/Playwright
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates fonts-liberation libasound2 \
    libatk1.0-0 libatk-bridge2.0-0 libdrm2 libgbm1 libgtk-3-0 \
    libnss3 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxrandr2 libxshmfence1 libxss1 libxtst6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
 && python -m playwright install --with-deps chromium

# Copiamos el código después para aprovechar caché de dependencias
COPY . /app/backend/

# Puerto
EXPOSE 8000

# Variables por defecto (se pueden sobreescribir en Railway)
ENV WA_HEADLESS=1

# Comando de arranque (usa PORT si está definido por el proveedor)
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
