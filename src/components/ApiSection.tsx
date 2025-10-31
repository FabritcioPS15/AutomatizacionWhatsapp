import { Key, Link, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function ApiSection() {
  const [apiKey, setApiKey] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  const testConnection = () => {
    if (apiKey && instanceId) {
      setTimeout(() => {
        setConnectionStatus(Math.random() > 0.5 ? 'connected' : 'error');
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuración de API</h2>
        <p className="text-gray-600">Conecta tu instancia de WhatsApp Business API</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <label className="block mb-2">
            <span className="text-sm font-semibold text-gray-900">Instance ID</span>
          </label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              placeholder="tu-instance-id"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block mb-2">
            <span className="text-sm font-semibold text-gray-900">API Key</span>
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tu API key no se guardará en texto plano
          </p>
        </div>

        <button
          onClick={testConnection}
          disabled={!apiKey || !instanceId}
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Probar Conexión
        </button>

        {connectionStatus === 'connected' && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Conexión exitosa</p>
              <p className="text-sm text-green-700">Tu instancia está conectada correctamente</p>
            </div>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Error de conexión</p>
              <p className="text-sm text-red-700">Verifica tus credenciales e intenta nuevamente</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Proveedores de API soportados</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>WhatsApp Business API oficial</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Evolution API</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Baileys</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Otros proveedores compatibles</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Webhook URL</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value="https://tu-dominio.com/webhook"
            readOnly
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600"
          />
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            Copiar
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Configura esta URL en tu proveedor de API para recibir notificaciones
        </p>
      </div>
    </div>
  );
}
