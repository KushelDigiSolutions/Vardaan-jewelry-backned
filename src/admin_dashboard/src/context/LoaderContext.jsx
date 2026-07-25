import React, { createContext, useContext, useState } from "react";
import { Loader2 } from "lucide-react";

const LoaderContext = createContext();

export function LoaderProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const showLoader = (message = "Please wait...") => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoader = () => {
    setIsLoading(false);
    setLoadingMessage("");
  };

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, isLoading, loadingMessage }}>
      {children}
      {isLoading && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "24px 32px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e2e8f0"
          }}>
            <Loader2 
              size={36} 
              style={{
                color: "#10b981",
                animation: "spin 1s linear infinite",
                marginBottom: "16px"
              }} 
            />
            <p style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#0f172a",
              margin: 0
            }}>
              {loadingMessage}
            </p>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}} />
        </div>
      )}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error("useLoader must be used within a LoaderProvider");
  }
  return context;
}
