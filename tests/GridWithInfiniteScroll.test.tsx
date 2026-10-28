import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GridWithInfiniteScroll from "src/components/GridWithInfiniteScroll";
import { createTestRoot } from "./render";

let intersection: IntersectionObserverEntry | null;
vi.mock("src/hooks/useIntersectionObserver", () => ({
  default: () => intersection,
}));
vi.mock("src/components/VideoItemWithHover", () => ({
  default: () => null,
}));

describe("infinite scrolling while the sentinel stays visible", () => {
  let view: ReturnType<typeof createTestRoot>;
  const handleNext = vi.fn();

  beforeEach(() => {
    view = createTestRoot();
    intersection = { intersectionRatio: 1 } as IntersectionObserverEntry;
    handleNext.mockClear();
  });
  afterEach(() => view.unmount());

  function renderPage(page: number, totalPages: number) {
    view.render(
      <GridWithInfiniteScroll
        genre={{ id: 28, name: "Action" }}
        data={{
          page,
          results: [],
          total_pages: totalPages,
          total_results: totalPages,
        }}
        handleNext={handleNext}
      />
    );
  }

  it("requests another page after the first response arrives without a new intersection", () => {
    renderPage(0, 0);
    expect(handleNext).not.toHaveBeenCalled();

    renderPage(1, 3);
    expect(handleNext).toHaveBeenCalledWith(2);
  });

  it("continues loading when another response still leaves the sentinel visible", () => {
    renderPage(1, 4);
    expect(handleNext).toHaveBeenCalledWith(2);
    handleNext.mockClear();

    renderPage(2, 4);
    expect(handleNext).toHaveBeenCalledWith(3);
  });

  it("stops at the last page", () => {
    renderPage(3, 3);
    expect(handleNext).not.toHaveBeenCalled();
  });

  it("waits while the sentinel is outside the viewport", () => {
    intersection = { intersectionRatio: 0 } as IntersectionObserverEntry;
    renderPage(1, 3);
    renderPage(2, 3);
    expect(handleNext).not.toHaveBeenCalled();

    intersection = { intersectionRatio: 1 } as IntersectionObserverEntry;
    renderPage(2, 3);
    expect(handleNext).toHaveBeenCalledWith(3);
  });
});
