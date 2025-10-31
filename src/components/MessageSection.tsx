import { Image as ImageIcon, MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MessageSectionProps {
  headers?: string[];
}

export default function MessageSection({ headers = [] }: MessageSectionProps) {
  const [message, setMessage] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

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
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Vista Previa</h3>
        </div>
        <div className="bg-green-500 rounded-xl rounded-bl-none p-4 max-w-md">
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Vista previa imagen"
              className="rounded-lg mb-2 max-w-xs w-full object-cover"
            />
          )}
          <p className="text-white whitespace-pre-wrap break-words">
            {message || 'Tu mensaje aparecerá aquí...'}
          </p>
          <span className="text-xs text-green-100 mt-2 block">
            {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
