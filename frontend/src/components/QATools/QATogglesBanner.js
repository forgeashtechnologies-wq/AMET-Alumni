import React, { useState } from 'react';

/**
 * QATogglesBanner - A development-only component that displays QA toggles and debug information
 * This banner is only visible in development environments and provides tools for QA testing
 */
const QATogglesBanner = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showBanner, setShowBanner] = useState(true);

  // Only show in development environment
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev || !showBanner) return null;

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const clearLogs = () => setLogs([]);

  const toggleExpand = () => setIsExpanded(prev => !prev);

  // Toggle styles
  const toggleButtonClass = "px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200";
  const toggleActiveClass = "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 text-white shadow-lg border-t-2 border-blue-500">
      <div className="flex justify-between items-center px-4 py-1">
        <div className="flex items-center">
          <span className="text-xs font-semibold bg-yellow-400 text-black px-2 py-0.5 rounded mr-2">
            DEV MODE
          </span>
          <h3 className="text-sm font-medium">QA Testing Tools</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleExpand} 
            className="text-xs text-white hover:text-blue-300"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button 
            onClick={() => setShowBanner(false)} 
            className="text-xs bg-red-600 hover:bg-red-700 px-1.5 py-0.5 rounded"
          >
            Close
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">QA Toggles</h4>
              <div className="space-y-2">
                <div>
                  <button 
                    className={`${toggleButtonClass} mr-2`}
                    onClick={() => {
                      addLog("Test log added");
                    }}
                  >
                    Add Test Log
                  </button>
                  <button 
                    className={`${toggleButtonClass}`}
                    onClick={() => {
                      logger.log("Current Environment:", process.env.NODE_ENV);
                      addLog(`Environment: ${process.env.NODE_ENV}`);
                    }}
                  >
                    Log Environment
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium">Debug Logs</h4>
                <button 
                  onClick={clearLogs}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              
              <div className="bg-black p-2 rounded h-40 overflow-y-auto text-xs font-mono">
                {logs.length ? (
                  logs.map((log, i) => <div key={i} className="text-green-400">{log}</div>)
                ) : (
                  <div className="text-gray-500 italic">No logs yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QATogglesBanner;
