import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    info: (msg) => addToast(msg, "info"),
    warning: (msg) => addToast(msg, "warning"),
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} style={{ color: "#10b981", flexShrink: 0 }} />;
      case "error":
        return <AlertCircle size={18} style={{ color: "#dc2626", flexShrink: 0 }} />;
      case "warning":
        return <AlertTriangle size={18} style={{ color: "#ea580c", flexShrink: 0 }} />;
      case "info":
      default:
        return <Info size={18} style={{ color: "#2563eb", flexShrink: 0 }} />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case "success":
        return "4px solid #10b981";
      case "error":
        return "4px solid #dc2626";
      case "warning":
        return "4px solid #ea580c";
      case "info":
      default:
        return "4px solid #2563eb";
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      
      {/* Toast Container */}
      <div style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "360px",
        pointerEvents: "none"
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes admin-toast-slide-in {
            from {
              transform: translateX(120%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .admin-toast-item {
            animation: admin-toast-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}} />
        {toasts.map((t) => (
          <div
            key={t.id}
            className="admin-toast-item"
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0",
              borderLeft: getBorderColor(t.type),
              transition: "all 0.3s ease-in-out"
            }}
          >
            {getIcon(t.type)}
            <div style={{
              flex: 1,
              fontSize: "14px",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              color: "#1e293b",
              lineHeight: 1.4
            }}>
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: "none",
                border: "none",
                padding: "2px",
                cursor: "pointer",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#475569"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
