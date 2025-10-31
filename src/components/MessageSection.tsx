import { Image as ImageIcon, MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useUploadData } from '../context/UploadDataContext';

export default function MessageSection() {
  const { excelData: ctxExcelData } = useUploadData();
  const [message, setMessage] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<any[][]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>(ctxExcelData?.headers ?? []);
  const [delaySeconds, setDelaySeconds] = useState<number>(5);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ total: number; sent: number; failed: number; paused: boolean; running: boolean; lastError?: string } | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const PERSIST_UPLOAD_KEY = 'wa_upload_state_v1';

  // Load saved message on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wa_message_template');
      if (saved) setMessage(saved);
    } catch {}
  }, []);

  // Persist message on change
  useEffect(() => {
    try {
      localStorage.setItem('wa_message_template', message);
    } catch {}
  }, [message]);

  // Load saved image on mount
  useEffect(() => {
    try {
      const savedImg = localStorage.getItem('wa_message_image_1');
      if (savedImg) setImageDataUrl(savedImg);
    } catch {}
  }, []);

  // Load uploaded data for preview
  useEffect(() => {
    // Preferir contexto si existe
    if (ctxExcelData && Array.isArray(ctxExcelData.rows)) {
      setRows(ctxExcelData.rows);
      setHeaders(ctxExcelData.headers || []);
      return;
    }
    // Fallback: snapshot ligero desde localStorage
    try {
      const raw = localStorage.getItem(PERSIST_UPLOAD_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.excelData?.rows && Array.isArray(saved.excelData.rows)) {
        setRows(saved.excelData.rows);
        setHeaders(Array.isArray(saved.excelData.headers) ? saved.excelData.headers : []);
      }
    } catch {}
  }, [ctxExcelData]);

  // Poll backend login status
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch('http://localhost:8000/status');
        if (r.ok) {
          const s = await r.json();
          if (!stop) setLoggedIn(!!s.logged_in);
        }
      } catch {
        if (!stop) setLoggedIn(false);
      } finally {
        if (!stop) setTimeout(tick, 2000);
      }
    };
    tick();
    return () => { stop = true; };
  }, []);

  const normalize = (s: any) => String(s ?? '').trim();
  const normalizeKey = (s: any) =>
    normalize(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const nombreIdx = useMemo(() => headers.map(normalizeKey).findIndex(h => h === 'nombre' || h.startsWith('nombre') || h.includes('cliente')), [headers]);
  const telefonoIdx = useMemo(() => headers.map(normalizeKey).findIndex(h => h === 'telefono' || h.includes('cel') || h.includes('phone')), [headers]);

  const selectedRow = rows[selectedIndex] || [];

  const resolvedMessage = useMemo(() => {
    if (!message) return '';
    let out = message;
    if (headers.length && selectedRow && selectedRow.length) {
      headers.forEach((h, idx) => {
        const token = `{{${h}}}`;
        if (out.includes(token)) {
          out = out.split(token).join(String(selectedRow[idx] ?? ''));
        }
      });
    }
    if (out.includes('{{nombre}}')) {
      const v = nombreIdx >= 0 ? selectedRow[nombreIdx] : '';
      out = out.split('{{nombre}}').join(String(v ?? ''));
    }
    if (out.includes('{{telefono}}')) {
      const v = telefonoIdx >= 0 ? selectedRow[telefonoIdx] : '';
      out = out.split('{{telefono}}').join(String(v ?? ''));
    }
    return out;
  }, [message, headers, selectedRow, nombreIdx, telefonoIdx]);

  const baseVariables = [
    { name: '{{nombre}}', description: 'Nombre del contacto' },
    { name: '{{telefono}}', description: 'Número de teléfono' },
  ];

  const headerVariables = headers
    .filter(h => h && h.trim().length > 0)
    .slice(0, 20)
    .map(h => ({ name: `{{${h}}}`, description: 'Desde Excel' }));

  const variables = [...baseVariables, ...headerVariables];

  const insertVariable = (variable: string) => {
    setMessage(prev => prev + variable);
  };

  const loadQr = async () => {
    try {
      const r = await fetch('http://localhost:8000/login-qr');
      if (!r.ok) throw new Error('QR no disponible');
      const data = await r.json();
      setQrDataUrl(data.qr_data_url || null);
    } catch (e) {
      setQrDataUrl(null);
      alert('No se pudo obtener el QR. Asegúrate que el backend esté ejecutándose.');
    }
  };

  const resolveForRow = (row: any[]): string => {
    if (!message) return '';
    let out = message;
    if (headers.length && row && row.length) {
      headers.forEach((h, idx) => {
        const token = `{{${h}}}`;
        if (out.includes(token)) {
          out = out.split(token).join(String(row[idx] ?? ''));
        }
      });
    }
    if (out.includes('{{nombre}}')) {
      const v = nombreIdx >= 0 ? row[nombreIdx] : '';
      out = out.split('{{nombre}}').join(String(v ?? ''));
    }
    if (out.includes('{{telefono}}')) {
      const v = telefonoIdx >= 0 ? row[telefonoIdx] : '';
      out = out.split('{{telefono}}').join(String(v ?? ''));
    }
    return out;
  };

  const sanitizePhone = (v: any): string => {
    let digits = String(v ?? '').replace(/[^0-9]/g, '');
    // Normalizar a Perú: si no trae código país, agregar 51
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('51')) return digits; // ya incluye código
    if (digits.length === 9) return `51${digits}`; // típico móvil peruano 9 dígitos
    return digits; // fallback: enviar como venga
  };

  const buildPayload = () => {
    const msgs: Array<{ to: string; text: string; image: null | { dataUrl: string } }> = [];
    const tIdx = telefonoIdx;
    if (tIdx < 0) return msgs;
    for (const r of rows) {
      const to = sanitizePhone(r[tIdx]);
      if (!to) continue;
      const text = resolveForRow(r);
      if (!text) continue;
      msgs.push({ to, text, image: imageDataUrl ? { dataUrl: imageDataUrl } : null });
    }
    return msgs;
  };

  const startSending = async () => {
    try {
      const messages = buildPayload();
      if (!messages.length) {
        alert('No hay mensajes válidos para enviar. Verifica la columna de teléfono y el mensaje.');
        return;
      }
      setSending(true);
      const res = await fetch('http://localhost:8000/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, delaySeconds: Math.max(0, delaySeconds) }),
      });
      if (!res.ok) throw new Error('No se pudo iniciar el envío');
      const data = await res.json();
      setJobId(data.jobId);
      setProgress({ total: messages.length, sent: 0, failed: 0, paused: false, running: true });
      pollProgress(data.jobId);
    } catch (e: any) {
      alert(e?.message || 'Error al iniciar envío');
      setSending(false);
    }
  };

  const pollProgress = async (id: string) => {
    let keep = true;
    while (keep) {
      try {
        const r = await fetch(`http://localhost:8000/progress?jobId=${encodeURIComponent(id)}`);
        if (!r.ok) throw new Error('Error progreso');
        const p = await r.json();
        setProgress(p);
        if (!p.running && !p.paused) {
          keep = false;
          setSending(false);
          break;
        }
        await new Promise(res => setTimeout(res, 1000));
      } catch {
        keep = false;
        setSending(false);
      }
    }
  };

  const pause = async () => {
    if (!jobId) return;
    await fetch('http://localhost:8000/pause', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId }) });
  };
  const resume = async () => {
    if (!jobId) return;
    await fetch('http://localhost:8000/resume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId }) });
  };
  const cancel = async () => {
    if (!jobId) return;
    await fetch('http://localhost:8000/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId }) });
  };

  const onPickImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageDataUrl(result);
      try { localStorage.setItem('wa_message_image_1', result); } catch {}
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configurar Mensaje</h2>
        <p className="text-gray-600">Personaliza el mensaje que se enviará a tus contactos</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <label className="block mb-3">
          <span className="text-sm font-semibold text-gray-900">Mensaje de WhatsApp</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hola {{nombre}}, te contactamos desde..."
          className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          aria-label="Mensaje de WhatsApp"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">{message.length} caracteres</span>
          <span className="text-xs text-gray-400">Usa variables para personalizar</span>
        </div>
      </div>

      {/* Imagen 1 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Imagen 1 (opcional)</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickImage(f);
              }}
            />
            <ImageIcon className="w-4 h-4" />
            Subir imagen
          </label>
          {imageDataUrl && (
            <button
              type="button"
              className="text-sm text-red-600 hover:underline"
              onClick={() => { setImageDataUrl(null); try { localStorage.removeItem('wa_message_image_1'); } catch {} }}
            >
              Quitar imagen
            </button>
          )}
        </div>
        {imageDataUrl && (
          <div className="mt-4">
            <img src={imageDataUrl} alt="Imagen 1" className="max-h-48 rounded-lg border" />
            <p className="text-xs text-gray-500 mt-2">La imagen se enviará junto con el mensaje.</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Variables Disponibles</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {variables.map((variable) => (
            <button
              key={variable.name}
              onClick={() => insertVariable(variable.name)}
              className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-lg hover:border-green-400 hover:shadow-sm transition-all text-left"
              type="button"
            >
              <div>
                <p className="font-mono text-sm font-medium text-green-700">{variable.name}</p>
                <p className="text-xs text-gray-600">{variable.description}</p>
              </div>
              <div className="text-green-600">+</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Estado de Sesión</h3>
          </div>
          <div className={`text-sm font-medium ${loggedIn ? 'text-green-700' : 'text-amber-700'}`}>
            {loggedIn ? 'Conectado a WhatsApp Web' : 'No conectado'}
          </div>
        </div>
        {!loggedIn && (
          <div className="space-y-3">
            <button
              onClick={loadQr}
              type="button"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Mostrar QR de inicio de sesión
            </button>
            {qrDataUrl && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg inline-block">
                <img src={qrDataUrl} alt="QR de WhatsApp" className="w-64 h-64 object-contain" />
                <p className="text-xs text-gray-600 mt-2 text-center">Escanea este QR con WhatsApp en tu teléfono</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Vista Previa</h3>
        </div>
        {rows.length > 0 ? (
          <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <label className="text-sm text-gray-600">Fila para previsualizar</label>
            <select
              className="border border-gray-300 rounded-md text-sm px-2 py-1 bg-white w-full sm:w-auto"
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
            >
              {rows.slice(0, Math.min(200, rows.length)).map((r, i) => {
                const name = nombreIdx >= 0 ? String(r[nombreIdx] ?? '') : '';
                const phone = telefonoIdx >= 0 ? String(r[telefonoIdx] ?? '') : '';
                const label = name || phone ? `${i + 1} - ${name}${name && phone ? ' / ' : ''}${phone}` : `${i + 1}`;
                return (
                  <option key={i} value={i}>{label}</option>
                );
              })}
            </select>
            <span className="text-xs text-gray-500">{rows.length} filas disponibles</span>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">Sube un archivo para ver la previsualización con datos reales.</p>
        )}
        <div className="bg-green-500 rounded-xl rounded-bl-none p-4 max-w-md">
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Vista previa imagen"
              className="rounded-lg mb-2 max-w-xs w-full object-cover"
            />
          )}
          <p className="text-white whitespace-pre-wrap break-words">
            {resolvedMessage || message || 'Tu mensaje aparecerá aquí...'}
          </p>
          <span className="text-xs text-green-100 mt-2 block">
            {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-900">Delay entre mensajes (seg)</label>
            <input
              type="number"
              min={0}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Math.max(0, Number(e.target.value)))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={startSending}
              disabled={sending || !rows.length || !message}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              type="button"
            >
              {sending ? 'Enviando…' : 'Iniciar Envío'}
            </button>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={pause} disabled={!jobId} className="flex-1 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:bg-gray-200">Pausar</button>
            <button onClick={resume} disabled={!jobId} className="flex-1 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:bg-gray-200">Reanudar</button>
            <button onClick={cancel} disabled={!jobId} className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-200">Cancelar</button>
          </div>
        </div>

        {progress && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-green-600 h-2" style={{ width: `${Math.min(100, (progress.sent / Math.max(1, progress.total)) * 100)}%` }} />
            </div>
            <div className="text-sm text-gray-700 flex items-center gap-4">
              <span><strong>Enviados:</strong> {progress.sent}/{progress.total}</span>
              <span><strong>Fallidos:</strong> {progress.failed}</span>
              {progress.paused && <span className="text-amber-600"><strong>PAUSADO</strong></span>}
              {!progress.running && !progress.paused && <span className="text-gray-600">Finalizado</span>}
              {progress.lastError && <span className="text-red-600 truncate"><strong>Error:</strong> {progress.lastError}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
