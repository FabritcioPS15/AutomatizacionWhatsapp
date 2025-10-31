import { Clock, Calendar, Zap } from 'lucide-react';
import { useState } from 'react';

export default function ScheduleSection() {
  const [sendMode, setSendMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Programación de Envío</h2>
        <p className="text-gray-600">Configura cuándo y cómo se enviarán los mensajes</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <label className="block mb-4">
            <span className="text-sm font-semibold text-gray-900">Modo de Envío</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSendMode('immediate')}
              className={`p-4 border-2 rounded-xl transition-all ${
                sendMode === 'immediate'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${sendMode === 'immediate' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Zap className={`w-5 h-5 ${sendMode === 'immediate' ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <span className="font-semibold text-gray-900">Inmediato</span>
              </div>
              <p className="text-sm text-gray-600 text-left">Enviar mensajes ahora mismo</p>
            </button>

            <button
              onClick={() => setSendMode('scheduled')}
              className={`p-4 border-2 rounded-xl transition-all ${
                sendMode === 'scheduled'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${sendMode === 'scheduled' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Calendar className={`w-5 h-5 ${sendMode === 'scheduled' ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <span className="font-semibold text-gray-900">Programado</span>
              </div>
              <p className="text-sm text-gray-600 text-left">Programar para fecha específica</p>
            </button>
          </div>
        </div>

        {sendMode === 'scheduled' && (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">
                  <span className="text-sm font-semibold text-gray-900">Fecha</span>
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block mb-2">
                  <span className="text-sm font-semibold text-gray-900">Hora</span>
                </label>
                <input
                  type="time"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <label className="block mb-2">
            <span className="text-sm font-semibold text-gray-900">Intervalo entre mensajes</span>
            <span className="text-xs text-gray-500 ml-2">(recomendado para evitar bloqueos)</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="60"
              value={delayBetweenMessages}
              onChange={(e) => setDelayBetweenMessages(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg min-w-[100px] justify-center">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-900">{delayBetweenMessages}s</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tiempo de espera entre cada mensaje enviado
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Recomendaciones</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Usa un intervalo de al menos 5 segundos entre mensajes</li>
              <li>• Evita enviar más de 100 mensajes por hora</li>
              <li>• Programa envíos durante horarios laborales</li>
              <li>• Respeta las políticas de uso de WhatsApp</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
