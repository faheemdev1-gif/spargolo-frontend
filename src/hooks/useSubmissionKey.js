import { useRef } from "react";

// Retry the same request with the same key; edits create a new request key.
export function useSubmissionKey() {
  const ref = useRef(null);
  return (payload) => {
    const serialized = JSON.stringify(payload);
    if (ref.current?.serialized !== serialized)
      ref.current = { serialized, key: crypto.randomUUID() };
    return ref.current.key;
  };
}
