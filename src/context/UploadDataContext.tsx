import React, { createContext, useContext, useMemo, useState } from 'react';

export interface ExcelData {
  headers: string[];
  rows: any[][];
}

export interface Summary {
  fechaActual: string;
  venceHoy: number;
  de1a3: number;
  de4a15: number;
  mas15: number;
}

interface MetaInfo {
  empresa: string | null;
  sede: string | null;
  clase: string | null;
}

interface UploadState {
  excelData: ExcelData | null;
  summary: Summary | null;
  meta: MetaInfo;
  colFechaIdx: number | null;
  colVigenciaIdx: number | null;
  pageSize: number;
  fileInfo: { name: string; size: number } | null;
}

interface UploadContextValue extends UploadState {
  setExcelData: (d: ExcelData | null) => void;
  setSummary: (s: Summary | null) => void;
  setMeta: (m: Partial<MetaInfo>) => void;
  setColFechaIdx: (i: number | null) => void;
  setColVigenciaIdx: (i: number | null) => void;
  setPageSize: (n: number) => void;
  setFileInfo: (fi: { name: string; size: number } | null) => void;
}

const UploadDataContext = createContext<UploadContextValue | undefined>(undefined);

export function UploadDataProvider({ children }: { children: React.ReactNode }) {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [meta, setMetaState] = useState<MetaInfo>({ empresa: null, sede: null, clase: null });
  const [colFechaIdx, setColFechaIdx] = useState<number | null>(null);
  const [colVigenciaIdx, setColVigenciaIdx] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  const value = useMemo<UploadContextValue>(() => ({
    excelData,
    summary,
    meta,
    colFechaIdx,
    colVigenciaIdx,
    pageSize,
    fileInfo,
    setExcelData,
    setSummary,
    setMeta: (m) => setMetaState(prev => ({ ...prev, ...m })),
    setColFechaIdx,
    setColVigenciaIdx,
    setPageSize,
    setFileInfo,
  }), [excelData, summary, meta, colFechaIdx, colVigenciaIdx, pageSize, fileInfo]);

  return (
    <UploadDataContext.Provider value={value}>
      {children}
    </UploadDataContext.Provider>
  );
}

export function useUploadData() {
  const ctx = useContext(UploadDataContext);
  if (!ctx) throw new Error('useUploadData must be used within UploadDataProvider');
  return ctx;
}
