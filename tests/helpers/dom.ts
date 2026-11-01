import { act } from "react";
import { createRoot } from "react-dom/client";

export function createDomRoot() {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  return {
    container,
    root,
    async cleanup() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}
