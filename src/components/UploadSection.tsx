import { Upload, FileSpreadsheet, AlertCircle, X, Table } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useUploadData } from '../context/UploadDataContext';

interface ExcelData {
  headers: string[];
  rows: any[][];
}

interface Summary {
  fechaActual: string;
  venceHoy: number;
  de1a3: number;
  de4a15: number;
  mas15: number;
}

interface UploadSectionProps {
  onExcelHeaders?: (headers: string[]) => void;
}

export default function UploadSection({ onExcelHeaders }: UploadSectionProps) {
  const {
    excelData: ctxExcelData,
    summary: ctxSummary,
    meta: ctxMeta,
    colFechaIdx: ctxColFechaIdx,
    colVigenciaIdx: ctxColVigenciaIdx,
    pageSize: ctxPageSize,
    fileInfo: ctxFileInfo,
    setExcelData: setCtxExcelData,
    setSummary: setCtxSummary,
    setMeta: setCtxMeta,
    setColFechaIdx: setCtxColFechaIdx,
    setColVigenciaIdx: setCtxColVigenciaIdx,
    setPageSize: setCtxPageSize,
    setFileInfo: setCtxFileInfo,
  } = useUploadData();
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rawPreview, setRawPreview] = useState<any[][] | null>(null);
  const [parseNote, setParseNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(ctxPageSize ?? 10);
  const [metaEmpresa, setMetaEmpresa] = useState<string | null>(ctxMeta?.empresa ?? null);
  const [metaSede, setMetaSede] = useState<string | null>(ctxMeta?.sede ?? null);
  const [metaClase, setMetaClase] = useState<string | null>(ctxMeta?.clase ?? null);
  const [colFechaIdx, setColFechaIdx] = useState<number | null>(ctxColFechaIdx ?? null);
  const [colVigenciaIdx, setColVigenciaIdx] = useState<number | null>(ctxColVigenciaIdx ?? null);
  const [quotaError, setQuotaError] = useState<boolean>(false);

  const PERSIST_KEY = 'wa_upload_state_v1';

  const addMonths = (date: Date, months: number) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setMonth(d.getMonth() + months);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const normalize = (s: any) => String(s ?? '').trim();
  const normalizeKey = (s: any) =>
    normalize(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const parseDateLoose = (v: any): Date | null => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {
      const parsed = XLSX.SSF.parse_date_code(v as any);
      if (!parsed) return null;
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
    const s = normalize(v);
    const parts = s.includes('/') ? s.split('/') : s.split('-');
    if (parts.length === 3) {
      let d: number, m: number, y: number;
      if (s.includes('/')) {
        [d, m, y] = parts.map(Number);
      } else {
        [y, m, d] = parts.map(Number);
      }
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d);
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  };

  const computeDaysRemaining = (headers: string[], row: any[]): number | '' => {
    const h = headers.map(x => normalizeKey(x));
    const fIdx = colFechaIdx != null ? colFechaIdx : h.findIndex(x => (x.includes('fecha') || x.startsWith('fech')) && (x.includes('inspec') || x.includes('inspeccion') || x.includes('rev') || x.includes('revision')));
    const vIdx = colVigenciaIdx != null ? colVigenciaIdx : h.findIndex(x => x.includes('vigen') || x === 'vigencia' || x.includes('mes'));
    if (fIdx < 0 || vIdx < 0) return '';
    const base = parseDateLoose(row[fIdx]);
    if (!base) return '';
    const vRaw = normalize(row[vIdx]).toLowerCase();
    const num = parseFloat(vRaw.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (isNaN(num)) return '';
    const months = num;
    const due = addMonths(base, months);
    const today = new Date();
    const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = due.getTime() - a.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const computeSummary = (headers: string[], rows: any[][]): Summary => {
    let venceHoy = 0, de1a3 = 0, de4a15 = 0, mas15 = 0;
    for (const row of rows) {
      const v = computeDaysRemaining(headers, row);
      if (v === '' || typeof v !== 'number') continue;
      if (v === 0) venceHoy++;
      else if (v >= 1 && v <= 3) de1a3++;
      else if (v >= 4 && v <= 15) de4a15++;
      else if (v > 15) mas15++;
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const fechaActual = `${pad(startToday.getDate())}/${pad(startToday.getMonth() + 1)}/${startToday.getFullYear()}`;
    return { fechaActual, venceHoy, de1a3, de4a15, mas15 };
  };

  const regenerateCsv = (headers: string[], rows: any[][]) => {
    try {
      const aoa = [
        [...headers, 'Días restantes'],
        ...rows.map(r => [...r, computeDaysRemaining(headers, r)]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const csv = XLSX.utils.sheet_to_csv(ws);
      setCsvData(csv);
    } catch {
      setCsvData(null);
    }
  };

  const updateCell = (absRowIdx: number, colIdx: number, value: string) => {
    setExcelData(prev => {
      if (!prev) return prev;
      const rows = prev.rows.map((r, i) => (i === absRowIdx ? (() => { const nr = r.slice(); nr[colIdx] = value; return nr; })() : r));
      const next = { headers: prev.headers, rows } as ExcelData;
      regenerateCsv(next.headers, next.rows);
      // Recalcular resumen con filas editadas
      setSummary(computeSummary(next.headers, next.rows));
      return next;
    });
  };

  useEffect(() => {
    if (excelData) {
      const nextSummary = computeSummary(excelData.headers, excelData.rows);
      setSummary(nextSummary);
      setCtxExcelData(excelData);
      setCtxSummary(nextSummary);
    } else {
      setSummary(null);
      setCtxExcelData(null);
      setCtxSummary(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelData]);

  // Persist to localStorage whenever core pieces change
  useEffect(() => {
    try {
      if (excelData) {
        const SNAP_ROWS = 300; // snapshot ligero para recarga
        const snapshot = {
          fileInfo,
          excelData: {
            headers: excelData.headers,
            rows: excelData.rows.slice(0, SNAP_ROWS),
          },
          summary,
          meta: { empresa: metaEmpresa, sede: metaSede, clase: metaClase },
          colFechaIdx,
          colVigenciaIdx,
          pageSize,
        };
        localStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot));
        setQuotaError(false);
        setUploadStatus('success');
      } else {
        localStorage.removeItem(PERSIST_KEY);
      }
    } catch {
      setQuotaError(true);
    }
    // Sync meta/indices to context
    setCtxMeta({ empresa: metaEmpresa, sede: metaSede, clase: metaClase });
    setCtxColFechaIdx(colFechaIdx);
    setCtxColVigenciaIdx(colVigenciaIdx);
    setCtxPageSize(pageSize);
    setCtxFileInfo(fileInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelData, summary, metaEmpresa, metaSede, metaClase, colFechaIdx, colVigenciaIdx, pageSize, fileInfo]);

  // Restore from localStorage on mount
  useEffect(() => {
    // Preferir contexto si ya existe (navegación entre menús)
    if (ctxExcelData && Array.isArray(ctxExcelData.headers) && Array.isArray(ctxExcelData.rows)) {
      setExcelData(ctxExcelData);
      setSummary(ctxSummary ?? null);
      setMetaEmpresa(ctxMeta?.empresa ?? null);
      setMetaSede(ctxMeta?.sede ?? null);
      setMetaClase(ctxMeta?.clase ?? null);
      setColFechaIdx(ctxColFechaIdx ?? null);
      setColVigenciaIdx(ctxColVigenciaIdx ?? null);
      setPageSize(ctxPageSize ?? 10);
      setFileInfo(ctxFileInfo ?? null);
      setUploadStatus('success');
      setCurrentPage(1);
      if (onExcelHeaders) onExcelHeaders(ctxExcelData.headers);
      return;
    }
    // Fallback: snapshot desde localStorage (tras recarga)
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && saved.excelData && Array.isArray(saved.excelData.headers) && Array.isArray(saved.excelData.rows)) {
        setExcelData(saved.excelData as ExcelData);
        setSummary(saved.summary ?? null);
        setMetaEmpresa(saved.meta?.empresa ?? null);
        setMetaSede(saved.meta?.sede ?? null);
        setMetaClase(saved.meta?.clase ?? null);
        setColFechaIdx(saved.colFechaIdx ?? null);
        setColVigenciaIdx(saved.colVigenciaIdx ?? null);
        setPageSize(saved.pageSize ?? 10);
        setFileInfo(saved.fileInfo ?? null);
        setUploadStatus('success');
        setCurrentPage(1);
        if (onExcelHeaders) onExcelHeaders(saved.excelData.headers);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    handleFileSelection(files);
  };

  const handleFileSelection = (selected: File[] | File | undefined) => {
    if (!selected) return;
    const files = Array.isArray(selected) ? selected : [selected];
    if (files.length === 0) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/html'
    ];

    const fileExtension = files[0].name.split('.').pop()?.toLowerCase();
    const isValidExtension = ['xls', 'xlsx', 'csv', 'htm', 'html'].includes(fileExtension || '');

    if (validTypes.includes(files[0].type) || isValidExtension) {
      setFile(files[0]);
      setFileInfo({ name: files[0].name, size: files[0].size });
      setExtraFiles(files.slice(1));
      setUploadStatus('success');
      parseExcelFile(files[0], files.slice(1));
    } else {
      setUploadStatus('error');
    }
  };

  const parseExcelFile = async (file: File, companions: File[] = []) => {
    try {
      const data = await file.arrayBuffer();
      // Manejar el caso de .xls generado como HTML y CSV explícito
      let workbook: XLSX.WorkBook;
      try {
        const text = await file.text();
        const lowerName = file.name.toLowerCase();
        const isCsv = file.type === 'text/csv' || lowerName.endsWith('.csv');
        const looksHtml = text.trim().toLowerCase().startsWith('<html');
        if (looksHtml) {
          // Si es un frameset (sin los archivos hoja), informar al usuario
          if (/Excel Workbook Frameset/i.test(text) && /id="shLink"/i.test(text)) {
            // Intentar localizar un archivo .htm/.html subido junto con el frameset
            const hrefMatch = text.match(/id="shLink"\s+href="([^"]+)"/i);
            const hrefName = hrefMatch ? hrefMatch[1].split('/').pop() : null;
            const allCandidates = [
              ...companions,
              ...extraFiles,
            ];
            let sheetFile: File | undefined;
            if (hrefName) {
              sheetFile = allCandidates.find(f => f.name.toLowerCase() === hrefName.toLowerCase());
            }
            if (!sheetFile) {
              sheetFile = allCandidates.find(f => /\.htm(l)?$/i.test(f.name));
            }
            if (sheetFile) {
              const sheetText = await sheetFile.text();
              workbook = XLSX.read(sheetText, { type: 'string' });
            } else {
              setParseNote('Este archivo es un “frameset” de Excel (.xls exportado como HTML). Súbalo junto con el archivo de hoja (por ejemplo, sheet001.htm) seleccionándolos a la vez, o conviértelo a .xlsx/.csv.');
              setExcelData(null);
              setRawPreview(null);
              setSummary(null);
              return;
            }
          } else {
            workbook = XLSX.read(text, { type: 'string' });
          }
        } else if (isCsv) {
          const firstLine = (text.split(/\r?\n/) || [])[0] || '';
          const semi = (firstLine.match(/;/g) || []).length;
          const comma = (firstLine.match(/,/g) || []).length;
          const FS = semi >= comma ? ';' : ',';
          workbook = XLSX.read(text, { type: 'string', FS });
        } else {
          workbook = XLSX.read(data, { type: 'array' });
        }
      } catch {
        workbook = XLSX.read(data, { type: 'array' });
      }
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length > 0) {
        // Extraer metadatos de las primeras ~15 filas
        let empresa: string | null = null;
        let sede: string | null = null;
        let clase: string | null = null;
        // Eliminado: resumen desde archivo para evitar inconsistencias; se calculará siempre desde los datos

        const getFirstNonEmptyCell = (row: any[]) => (row || []).find(c => String(c ?? '').trim() !== undefined && String(c ?? '').trim() !== '') ?? '';
        for (let i = 0; i < Math.min(15, jsonData.length); i++) {
          const row = jsonData[i] || [];
          const joined = String(getFirstNonEmptyCell(row)).trim();
          if (!empresa) {
            const m = joined.match(/^Empresa:\s*(.+)$/i);
            if (m) empresa = m[1].trim();
          }
          if (!sede) {
            const m = joined.match(/^Sede:\s*(.+)$/i);
            if (m) sede = m[1].trim();
          }
          if (!clase) {
            const m = joined.match(/^Clase\s*Vehiculo:\s*(.+)$/i);
            if (m) clase = m[1].trim();
          }
          // Se ignora el bloque de resumen del archivo para mantener consistencia con el cálculo en tiempo real
        }
        setMetaEmpresa(empresa);
        setMetaSede(sede);
        setMetaClase(clase);

        // Detectar fila de encabezados reales (ej: contiene "Placa")
        const headerRowIndex = jsonData.findIndex(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim().toLowerCase() === 'placa'));
        const headerRow = headerRowIndex >= 0 ? jsonData[headerRowIndex] : jsonData[0];
        const headers = (headerRow as string[]).map(h => String(h || '').trim());
        // Detectar y fijar índices de columnas clave
        const hNorm = headers.map(n => normalizeKey(n));
        const fIdxFixed = hNorm.findIndex(x => (x.includes('fecha') || x.startsWith('fech')) && (x.includes('inspec') || x.includes('inspeccion') || x.includes('rev') || x.includes('revision')));
        const vIdxFixed = hNorm.findIndex(x => x.includes('vigen') || x === 'vigencia' || x.includes('mes'));
        const dataRows = jsonData
          .slice(headerRowIndex >= 0 ? headerRowIndex + 1 : 1)
          .filter(row => row && row.some(cell => cell !== undefined && cell !== ''))
          .map(row => {
            const out: any[] = new Array(headers.length).fill('');
            for (let i = 0; i < headers.length; i++) out[i] = (row || [])[i] ?? '';
            return out;
          });
        setParseNote(null);
        setRawPreview(null);

        setExcelData({ headers, rows: dataRows });
        setColFechaIdx(fIdxFixed >= 0 ? fIdxFixed : null);
        setColVigenciaIdx(vIdxFixed >= 0 ? vIdxFixed : null);
        regenerateCsv(headers, dataRows);
        setCurrentPage(1);
        if (onExcelHeaders) onExcelHeaders(headers);

        // Calcular resumen inicialmente desde los datos calculados
        setSummary(computeSummary(headers, dataRows));
      }
      // Guardar una vista cruda para diagnóstico si no hay datos
      if (!jsonData || jsonData.length === 0) {
        setParseNote('La hoja está vacía o no se pudo leer contenido.');
      } else if (!excelData) {
        setRawPreview(jsonData.slice(0, 25));
      }
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setUploadStatus('error');
      setParseNote('Ocurrió un error al leer el archivo. Revisa que no esté protegido y que el formato sea XLSX/XLS/CSV.');
    } finally {
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFileSelection(files);
  };

  const removeFile = () => {
    setFile(null);
    setFileInfo(null);
    setExtraFiles([]);
    setUploadStatus('idle');
    setExcelData(null);
    setCsvData(null);
    setCurrentPage(1);
    if (onExcelHeaders) onExcelHeaders([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    try { localStorage.removeItem(PERSIST_KEY); } catch {}
    // limpiar contexto
    setCtxExcelData(null);
    setCtxSummary(null);
    setCtxMeta({ empresa: null, sede: null, clase: null });
    setCtxColFechaIdx(null);
    setCtxColVigenciaIdx(null);
    setCtxFileInfo(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subir Archivo de Contactos</h2>
        <p className="text-gray-600">Arrastra tu archivo Excel o CSV con los datos de contactos</p>
      </div>

      {!file && !fileInfo ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl transition-all ${
            isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Upload className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Arrastra tu archivo aquí
            </h3>
            <p className="text-gray-600 mb-4">o haz clic para seleccionar</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.htm,.html"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer font-medium"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Seleccionar Archivo
            </label>
            <p className="text-sm text-gray-500 mt-4">
              Formatos soportados: Excel (.xlsx, .xls) o CSV
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{file?.name || fileInfo?.name}</p>
                <p className="text-xs text-gray-500">{(((file?.size ?? fileInfo?.size) || 0) / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar archivo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {(metaEmpresa || metaSede || metaClase) && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Empresa</p>
              <p className="text-base font-medium text-gray-900">{metaEmpresa ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sede</p>
              <p className="text-base font-medium text-gray-900">{metaSede ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Clase Vehiculo</p>
              <p className="text-base font-medium text-gray-900">{metaClase ?? '-'}</p>
            </div>
          </div>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Formato de archivo no válido</p>
            <p className="text-sm text-red-700">Por favor, sube un archivo Excel o CSV</p>
          </div>
        </div>
      )}

      {quotaError && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          No se pudo guardar el snapshot por límite de almacenamiento del navegador. La vista previa tras recarga puede no estar disponible.
        </div>
      )}

      {!file && !fileInfo && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Formato del Archivo</h3>
          <p className="text-sm text-gray-600 mb-4">
            Asegúrate de que tu archivo contenga las siguientes columnas:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Nombre</span>
              <span className="text-gray-500">-</span>
              <span className="text-gray-600">Nombre del contacto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Teléfono</span>
              <span className="text-gray-500">-</span>
              <span className="text-gray-600">Número con código de país</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Variable1, Variable2...</span>
              <span className="text-gray-500">-</span>
              <span className="text-gray-600">Variables personalizadas (opcional)</span>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Fecha Actual</p>
            <p className="text-2xl font-semibold text-gray-900">{summary.fechaActual}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Vence Hoy</p>
            <p className="text-3xl font-semibold text-amber-600">{summary.venceHoy}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">De 1 a 3 días</p>
            <p className="text-3xl font-semibold text-orange-600">{summary.de1a3}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">De 4 a 15 días</p>
            <p className="text-3xl font-semibold text-yellow-700">{summary.de4a15}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Más de 15 días</p>
            <p className="text-3xl font-semibold text-green-700">{summary.mas15}</p>
          </div>
        </div>
      )}

      {false && parseNote && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
          {parseNote}
        </div>
      )}

      {false && rawPreview && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-auto">
          <div className="p-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-700">Diagnóstico: primeras 25 filas crudas</div>
          <table className="min-w-full text-xs">
            <tbody>
              {(rawPreview ?? []).map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1 whitespace-nowrap">{String(c ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {excelData && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Datos del Archivo</h3>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                Filas por página
                <select
                  className="border border-gray-300 rounded-md text-sm px-2 py-1 bg-white"
                  value={pageSize}
                  onChange={(e) => {
                    const size = Number(e.target.value);
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <span className="text-sm text-gray-600">{excelData.rows.length} registros</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                  {excelData.headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Días restantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  const total = excelData.rows.length;
                  const startIndex = (currentPage - 1) * pageSize;
                  const endIndex = Math.min(startIndex + pageSize, total);
                  const pageRows = excelData.rows.slice(startIndex, endIndex);
                  return pageRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500">{startIndex + rowIndex + 1}</td>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900">
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => updateCell(startIndex + rowIndex, cellIndex, (e.target as HTMLElement).innerText)}
                          >
                            {cell !== undefined && cell !== null ? String(cell) : '-'}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {computeDaysRemaining(excelData.headers, row) as any}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          {(() => {
            const total = excelData.rows.length;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
            const endIndex = Math.min(currentPage * pageSize, total);
            return (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-600">
                  Mostrando {total === 0 ? 0 : startIndex}–{endIndex} de {total} registros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white disabled:opacity-50"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {(file || fileInfo) && excelData && (
        <div className="space-y-2">
          <button className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg shadow-lg shadow-green-600/20">
            Continuar con {excelData.rows.length} Contactos
          </button>
          {csvData && (
            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              CSV generado en memoria y listo para procesar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
