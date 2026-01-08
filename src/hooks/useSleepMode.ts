import { useEffect, useRef, useCallback } from 'react';
import { useVisionStore } from '../store/useVisionStore';

interface UseSleepModeOptions {
  enabled?: boolean;
}

export function useSleepMode(options: UseSleepModeOptions = {}) {
  const { enabled = true } = options;

  const {
    isActive,
    isPaused,
    isSleeping,
    lastActivityTime,
    settings,
    setSleeping,
    updateActivity,
  } = useVisionStore();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const motionThreshold = useRef(10); // Minimum movement to consider as activity

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check for sleep condition
  useEffect(() => {
    if (!enabled || !isActive || isPaused || isSleeping) {
      return;
    }

    const checkSleep = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      if (timeSinceActivity >= settings.sleepTimeoutMs) {
        setSleeping(true);
      }
    };

    // Set up interval to check for sleep
    timeoutRef.current = setInterval(checkSleep, 1000);

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [enabled, isActive, isPaused, isSleeping, lastActivityTime, settings.sleepTimeoutMs, setSleeping]);

  // Motion detection from device sensors
  useEffect(() => {
    if (!enabled || !isActive || isSleeping) {
      return;
    }

    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;

      if (!acceleration) return;

      const x = acceleration.x || 0;
      const y = acceleration.y || 0;
      const z = acceleration.z || 0;

      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);

      const totalMovement = deltaX + deltaY + deltaZ;

      if (totalMovement > motionThreshold.current) {
        updateActivity();
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    };

    // Request permission for motion sensors (iOS 13+)
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
    ) {
      (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> })
        .requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, isActive, isSleeping, updateActivity]);

  // Touch/mouse activity detection
  useEffect(() => {
    if (!enabled || !isActive) {
      return;
    }

    const handleActivity = () => {
      updateActivity();
    };

    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('touchmove', handleActivity);
    window.addEventListener('mousemove', handleActivity);

    return () => {
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('touchmove', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
    };
  }, [enabled, isActive, updateActivity]);

  const wake = useCallback(() => {
    setSleeping(false);
    updateActivity();
  }, [setSleeping, updateActivity]);

  return {
    isSleeping,
    wake,
    updateActivity,
  };
}
