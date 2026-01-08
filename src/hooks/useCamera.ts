import { useEffect, useRef, useState, useCallback } from 'react';
import { CameraSettings } from '../types';

interface UseCameraOptions {
  autoStart?: boolean;
  settings?: Partial<CameraSettings>;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isReady: boolean;
  isStreaming: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => ImageData | null;
  switchCamera: () => Promise<void>;
  currentFacingMode: 'user' | 'environment';
}

const DEFAULT_SETTINGS: CameraSettings = {
  facingMode: 'environment',
  resolution: { width: 1280, height: 720 },
  frameRate: 30,
};

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { autoStart = false, settings = {} } = options;
  const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(
    mergedSettings.facingMode
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: mergedSettings.resolution.width },
          height: { ideal: mergedSettings.resolution.height },
          frameRate: { ideal: mergedSettings.frameRate },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsReady(true);
          setIsStreaming(true);
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      console.error('Camera error:', err);
    }
  }, [currentFacingMode, mergedSettings, stopCamera]);

  const switchCamera = useCallback(async () => {
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    setCurrentFacingMode(newFacingMode);
  }, [currentFacingMode]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isStreaming) {
      startCamera();
    }
  }, [currentFacingMode]);

  const captureFrame = useCallback((): ImageData | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isReady) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [isReady]);

  // Auto-start camera if option is set
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [autoStart]);

  return {
    videoRef,
    canvasRef,
    isReady,
    isStreaming,
    error,
    startCamera,
    stopCamera,
    captureFrame,
    switchCamera,
    currentFacingMode,
  };
}
