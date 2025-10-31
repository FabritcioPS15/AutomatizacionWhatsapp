import { useState } from 'react';
import { UploadDataProvider } from './context/UploadDataContext';
import Sidebar from './components/Sidebar';
import UploadSection from './components/UploadSection';
import MessageSection from './components/MessageSection';
import ScheduleSection from './components/ScheduleSection';
import ApiSection from './components/ApiSection';
import SettingsSection from './components/SettingsSection';

function App() {
  const [activeSection, setActiveSection] = useState('upload');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Headers are provided via UploadDataProvider context now

  return (
    <UploadDataProvider>
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 md:hidden">
        <button
          aria-label="Abrir menú"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div className="font-semibold text-gray-900">WhatsApp Bot</div>
        <div className="w-8" />
      </div>

      {/* Sidebar desktop and mobile */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setIsMobileSidebarOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Overlay for mobile when sidebar is open */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto w-full">
        <div className="max-w-none w-full p-4 md:p-8 pt-20 md:pt-8">
          {(() => {
            switch (activeSection) {
              case 'upload':
                return <UploadSection />;
              case 'message':
                return <MessageSection />;
              case 'schedule':
                return <ScheduleSection />;
              case 'api':
                return <ApiSection />;
              case 'settings':
                return <SettingsSection />;
              default:
                return <UploadSection />;
            }
          })()}
        </div>
      </main>
    </div>
    </UploadDataProvider>
  );
}

export default App;
