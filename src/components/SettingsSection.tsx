import { Settings, Bell, Shield, Database } from 'lucide-react';
import { useState } from 'react';

export default function SettingsSection() {
  const [notifications, setNotifications] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuración General</h2>
        <p className="text-gray-600">Ajusta las preferencias del sistema</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Recibe alertas sobre el estado de los envíos
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Reintento automático</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Reintentar envío en caso de fallo
                </p>
              </div>
            </div>
            <button
              onClick={() => setAutoRetry(!autoRetry)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRetry ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRetry ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Guardar historial</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Mantener registro de mensajes enviados
                </p>
              </div>
            </div>
            <button
              onClick={() => setSaveHistory(!saveHistory)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                saveHistory ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  saveHistory ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Límites de Envío
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-2">
              <span className="text-sm font-semibold text-gray-900">Mensajes por hora</span>
            </label>
            <input
              type="number"
              defaultValue={100}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block mb-2">
              <span className="text-sm font-semibold text-gray-900">Máximo de reintentos</span>
            </label>
            <input
              type="number"
              defaultValue={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Zona de Peligro</h3>
        <p className="text-sm text-gray-600 mb-4">
          Estas acciones son irreversibles. Procede con precaución.
        </p>
        <div className="space-y-3">
          <button className="w-full py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-medium">
            Limpiar historial de envíos
          </button>
          <button className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
            Restablecer configuración
          </button>
        </div>
      </div>
    </div>
  );
}
