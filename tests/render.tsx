import { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

export function createTestRoot() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    render(element: ReactElement) {
      act(() => root.render(element));
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}
