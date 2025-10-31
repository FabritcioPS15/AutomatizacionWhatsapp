import { Settings, MessageSquare, Users, Clock, Key, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ activeSection, onSectionChange, isCollapsed, onToggleCollapse, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const menuItems = [
    { id: 'upload', label: 'Subir Datos', icon: Users },
    { id: 'message', label: 'Mensaje', icon: MessageSquare },
    { id: 'schedule', label: 'Programación', icon: Clock },
    { id: 'api', label: 'API Config', icon: Key },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 md:static md:z-auto bg-white border-r border-gray-200 flex flex-col transition-all duration-300
      ${isCollapsed ? 'w-20' : 'w-64'}
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      aria-hidden={!isMobileOpen}
    >
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">WhatsApp Bot</h1>
              <p className="text-xs text-gray-500">Automatización</p>
            </div>
          )}
          {/* Close button on mobile */}
          <button
            onClick={onMobileClose}
            className="md:hidden ml-auto rounded-md p-2 text-gray-700 hover:bg-gray-100"
            aria-label="Cerrar menú"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  title={isCollapsed ? item.label : ''}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onToggleCollapse}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!isCollapsed && <span className="text-sm font-medium">Colapsar</span>}
        </button>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
          {!isCollapsed && (
            <p className="text-sm font-medium text-gray-900 mb-1">Estado del Sistema</p>
          )}
          <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            {!isCollapsed && <span className="text-xs text-gray-600">Conectado</span>}
          </div>
        </div>
      </div>
    </aside>
  );
}
