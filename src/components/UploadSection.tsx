import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Table } from 'lucide-react';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

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
  const [file, setFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rawPreview, setRawPreview] = useState<any[][] | null>(null);
  const [parseNote, setParseNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<string | null>(null);

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
      setExtraFiles(files.slice(1));
      setUploadStatus('success');
      parseExcelFile(files[0], files.slice(1));
    } else {
      setUploadStatus('error');
    }
  };

  const parseExcelFile = async (file: File, companions: File[] = []) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      // Manejar el caso de .xls generado como HTML
      let workbook: XLSX.WorkBook;
      try {
        const text = await file.text();
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
        // Buscar la fila que contiene el encabezado real (ej. "Placa")
        let headerRowIndex = jsonData.findIndex(row =>
          row.some(cell => String(cell ?? '').toLowerCase().trim() === 'placa')
        );

        if (headerRowIndex < 0) {
          // Heurística alternativa: primera fila con >= 3 celdas no vacías con palabra 'placa'
          headerRowIndex = jsonData.findIndex(row => {
            const filled = row.filter(c => String(c ?? '').trim() !== '').length;
            return filled >= 3 && row.some(c => /placa/i.test(String(c ?? '')));
          });
        }
        if (headerRowIndex < 0 && jsonData.length > 10) {
          // Fallback explícito: usar fila 11 como encabezado (índice 10)
          headerRowIndex = 10;
        }

        const headerRow = headerRowIndex >= 0 ? jsonData[headerRowIndex] : jsonData[0];
        const headers = (headerRow as string[]).map(h => String(h || '').trim());

        // Filas de datos: desde la siguiente fila hasta que existan valores
        const dataRows = jsonData
          .slice(headerRowIndex >= 0 ? headerRowIndex + 1 : 1)
          .filter(row => row && row.some(cell => cell !== undefined && cell !== ''))
          .map(row => row.slice(0, headers.length));

        if (headerRowIndex < 0) {
          setParseNote('No se encontró la fila de encabezados ("Placa"). Mostrando diagnóstico.');
          setRawPreview(jsonData.slice(0, 25));
        } else {
          setParseNote(null);
          setRawPreview(null);
        }

        setExcelData({ headers, rows: dataRows });
        // Generar CSV en memoria inmediatamente
        try {
          const aoa = [headers, ...dataRows];
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          const csv = XLSX.utils.sheet_to_csv(ws);
          setCsvData(csv);
        } catch {
          setCsvData(null);
        }
        if (onExcelHeaders) onExcelHeaders(headers);

        // Calcular resumen por fechas usando la columna de vencimiento
        const vencColIdx = headers.findIndex(h => h.toLowerCase().includes('venc')); // "Fech. Vencimiento"
        const today = new Date();
        const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const toDate = (v: any): Date | null => {
          if (v == null || v === '') return null;
          if (typeof v === 'number') {
            const parsed = XLSX.SSF.parse_date_code(v);
            if (!parsed) return null;
            return new Date(parsed.y, parsed.m - 1, parsed.d);
          }
          const s = String(v).trim();
          // Intentar formatos dd/mm/yyyy o yyyy-mm-dd
          const parts = s.includes('/') ? s.split('/') : s.split('-');
          if (parts.length === 3) {
            let d: number, m: number, y: number;
            if (s.includes('/')) {
              // dd/mm/yyyy
              [d, m, y] = parts.map(Number);
            } else {
              // yyyy-mm-dd
              [y, m, d] = parts.map(Number);
            }
            if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
              return new Date(y, m - 1, d);
            }
          }
          const dt = new Date(s);
          return isNaN(dt.getTime()) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        };

        let venceHoy = 0, de1a3 = 0, de4a15 = 0, mas15 = 0;
        if (vencColIdx >= 0) {
          for (const row of dataRows) {
            const dt = toDate(row[vencColIdx]);
            if (!dt) continue;
            const diffMs = dt.getTime() - startToday.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) venceHoy++;
            else if (diffDays >= 1 && diffDays <= 3) de1a3++;
            else if (diffDays >= 4 && diffDays <= 15) de4a15++;
            else if (diffDays > 15) mas15++;
          }
        }

        const pad = (n: number) => n.toString().padStart(2, '0');
        const fechaActual = `${pad(startToday.getDate())}/${pad(startToday.getMonth() + 1)}/${startToday.getFullYear()}`;
        setSummary({ fechaActual, venceHoy, de1a3, de4a15, mas15 });
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
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFileSelection(files);
  };

  const removeFile = () => {
    setFile(null);
    setExtraFiles([]);
    setUploadStatus('idle');
    setExcelData(null);
    setCsvData(null);
    if (onExcelHeaders) onExcelHeaders([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Subir Archivo de Contactos</h2>
        <p className="text-gray-600">Arrastra tu archivo Excel o CSV con los datos de contactos</p>
      </div>

      {!file ? (
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
                <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
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

      {uploadStatus === 'error' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Formato de archivo no válido</p>
            <p className="text-sm text-red-700">Por favor, sube un archivo Excel o CSV</p>
          </div>
        </div>
      )}

      {!file && (
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

      {parseNote && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
          {parseNote}
        </div>
      )}

      {rawPreview && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-auto">
          <div className="p-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-700">Diagnóstico: primeras 25 filas crudas</div>
          <table className="min-w-full text-xs">
            <tbody>
              {rawPreview.map((r, i) => (
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
            <span className="text-sm text-gray-600">{excelData.rows.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    #
                  </th>
                  {excelData.headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {excelData.rows.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{rowIndex + 1}</td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900">
                        {cell !== undefined && cell !== null ? String(cell) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {excelData.rows.length > 10 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Mostrando 10 de {excelData.rows.length} registros
              </p>
            </div>
          )}
        </div>
      )}

      {file && excelData && (
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
