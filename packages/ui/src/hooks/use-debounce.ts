import { useEffect, useMemo, useRef, useState } from "react";

// biome-ignore lint/suspicious/noExplicitAny: Generic callback type
type AnyFunction = (...args: any[]) => void;

/**
 * Debounces a value. Returns the debounced value that only updates
 * after `delay` ms have passed since the last change.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Creates a debounced version of a callback function.
 * The callback will only be invoked after `delay` ms have passed
 * since the last invocation.
 */
export function useDebounceCallback<T extends AnyFunction>(
  callback: T,
  delay: number,
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useMemo(() => {
    const fn = ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T;
    return fn;
  }, [delay]);

  return debouncedCallback;
}

/**
 * Flushes any pending debounced call immediately and cancels the timeout.
 * Returns a flush function that can be called imperatively.
 */
export function useDebounceCallbackWithFlush<T extends AnyFunction>(
  callback: T,
  delay: number,
): { debouncedCallback: T; flush: () => void; cancel: () => void } {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: Store args for flush
  const pendingArgsRef = useRef<any[] | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Flush on unmount instead of cancelling — ensures pending saves are never lost
  useEffect(() => {
    return () => {
      if (timeoutRef.current && pendingArgsRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        callbackRef.current(...pendingArgsRef.current);
        pendingArgsRef.current = null;
      }
    };
  }, []);

  const result = useMemo(() => {
    const debouncedCallback = ((...args: Parameters<T>) => {
      pendingArgsRef.current = args;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        pendingArgsRef.current = null;
        callbackRef.current(...args);
      }, delay);
    }) as T;

    const flush = () => {
      if (timeoutRef.current && pendingArgsRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        callbackRef.current(...pendingArgsRef.current);
        pendingArgsRef.current = null;
      }
    };

    const cancel = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        pendingArgsRef.current = null;
      }
    };

    return { debouncedCallback, flush, cancel };
  }, [delay]);

  return result;
}
