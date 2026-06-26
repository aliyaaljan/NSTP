"use client";

import { useState, useEffect, useRef } from "react";
import { IconX, IconCamera } from "@tabler/icons-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCameraRotate } from "@fortawesome/free-solid-svg-icons";

interface QrScannerProps {
  onClose: () => void;
  onScan?: (data: string) => void;
}

export function QrScanner({ onClose, onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startCamera = async () => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
        setScanning(true);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to access camera";
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        setError("Camera access denied. Please allow camera permissions.");
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("No device")) {
        setError("No camera found. Please connect a camera.");
      } else {
        setError("Unable to access camera. Please check your camera.");
      }
      setScanning(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    };
  }, [facingMode]);

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div className="scanner-backdrop" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <span className="scanner-title">Scan QR Code</span>
          <button className="scanner-close" onClick={onClose} aria-label="Close">
            <IconX size={20} stroke={1.75} />
          </button>
        </div>
        <div className="scanner-body">
          {error ? (
            <div className="scanner-error">
              <IconCamera size={40} stroke={1.5} />
              <p>{error}</p>
              <button 
                onClick={startCamera}
                style={{
                  marginTop: "12px",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "#14492E",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="scanner-video"
              />
              <div className="scanner-frame">
                <div className="scanner-corner tl" />
                <div className="scanner-corner tr" />
                <div className="scanner-corner bl" />
                <div className="scanner-corner br" />
                {scanning && <div className="scanner-line" />}
              </div>
              
              {/* Camera Flip Button */}
              {isMobile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    flipCamera();
                  }}
                  className="scanner-flip-btn"
                  aria-label="Flip camera"
                >
                  <FontAwesomeIcon 
                    icon={faCameraRotate} 
                    size="lg"
                    style={{ 
                      width: "24px", 
                      height: "24px",
                      color: "#fff",
                    }}
                  />
                </button>
              )}

              {/* Camera mode indicator */}
              {isMobile && (
                <div className="camera-mode-indicator">
                  {facingMode === "environment" ? "Back Camera" : "Front Camera"}
                </div>
              )}
            </>
          )}
        </div>
        <p className="scanner-hint">
          {error ? "Tap retry to try again" : (
            <>
              Point your camera at a QR code
              <br />
              {isMobile && !error && "Tap camera icon to flip camera"}
            </>
          )}
        </p>
      </div>

      <style>{`
        .scanner-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .scanner-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .scanner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #ECECEA;
          background: #fff;
        }
        .scanner-title {
          font-weight: 700;
          font-size: 16px;
          color: #1A1A1A;
        }
        .scanner-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #8A8A8A;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.12s;
        }
        .scanner-close:hover {
          background: #F0F0F0;
        }
        .scanner-body {
          position: relative;
          width: 100%;
          aspect-ratio: 1/1;
          background: #000;
          overflow: hidden;
        }
        .scanner-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .scanner-frame {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .scanner-corner {
          position: absolute;
          width: 28px;
          height: 28px;
          border-color: #fff;
          border-style: solid;
          border-width: 0;
          opacity: 0.9;
        }
        .scanner-corner.tl {
          top: 40px;
          left: 40px;
          border-top-width: 3px;
          border-left-width: 3px;
          border-radius: 4px 0 0 0;
        }
        .scanner-corner.tr {
          top: 40px;
          right: 40px;
          border-top-width: 3px;
          border-right-width: 3px;
          border-radius: 0 4px 0 0;
        }
        .scanner-corner.bl {
          bottom: 40px;
          left: 40px;
          border-bottom-width: 3px;
          border-left-width: 3px;
          border-radius: 0 0 0 4px;
        }
        .scanner-corner.br {
          bottom: 40px;
          right: 40px;
          border-bottom-width: 3px;
          border-right-width: 3px;
          border-radius: 0 0 4px 0;
        }
        .scanner-line {
          position: absolute;
          left: 44px;
          right: 44px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #14492E, transparent);
          animation: scan 2.5s ease-in-out infinite;
          top: 44px;
          box-shadow: 0 0 20px rgba(20, 73, 46, 0.3);
        }
        @keyframes scan {
          0% { top: 44px; opacity: 1; }
          90% { top: calc(100% - 44px); opacity: 1; }
          100% { top: calc(100% - 44px); opacity: 0; }
        }

        /* Flip Button */
        .scanner-flip-btn {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .scanner-flip-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateX(-50%) scale(1.08);
          border-color: rgba(255, 255, 255, 0.6);
        }
        .scanner-flip-btn:active {
          transform: translateX(-50%) scale(0.92);
        }

        .camera-mode-indicator {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 5px 16px;
          border-radius: 20px;
          color: #fff;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.3px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: 'Montserrat', sans-serif;
        }

        .scanner-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 12px;
          color: #8A8A8A;
          padding: 20px;
          text-align: center;
          font-size: 13px;
        }
        .scanner-hint {
          text-align: center;
          font-size: 12px;
          color: #8A8A8A;
          padding: 12px 20px 16px;
          margin: 0;
          font-weight: 500;
          background: #fff;
          line-height: 1.6;
        }

        @media (max-width: 480px) {
          .scanner-modal {
            border-radius: 16px;
            max-width: 100%;
          }
          .scanner-corner {
            width: 20px;
            height: 20px;
          }
          .scanner-corner.tl, .scanner-corner.bl {
            left: 24px;
          }
          .scanner-corner.tr, .scanner-corner.br {
            right: 24px;
          }
          .scanner-corner.tl, .scanner-corner.tr {
            top: 24px;
          }
          .scanner-corner.bl, .scanner-corner.br {
            bottom: 24px;
          }
          .scanner-line {
            left: 28px;
            right: 28px;
          }
          @keyframes scan {
            0% { top: 28px; opacity: 1; }
            90% { top: calc(100% - 28px); opacity: 1; }
            100% { top: calc(100% - 28px); opacity: 0; }
          }
          .scanner-flip-btn {
            width: 52px;
            height: 52px;
            bottom: 18px;
          }
          .scanner-flip-btn svg {
            width: 20px !important;
            height: 20px !important;
          }
          .camera-mode-indicator {
            font-size: 10px;
            padding: 4px 12px;
            top: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}