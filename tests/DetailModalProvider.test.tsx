import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react-dom/test-utils";
import { MemoryRouter, useNavigate } from "react-router-dom";
import DetailModalProvider, {
  DetailModalConsumerProps,
  useDetailModal,
} from "src/providers/DetailModalProvider";
import { MEDIA_TYPE } from "src/types/Common";
import { MovieDetail } from "src/types/Movie";
import { createTestRoot } from "./render";

const { getAppendedVideos } = vi.hoisted(() => ({
  getAppendedVideos: vi.fn(),
}));
vi.mock("src/store/slices/discover", () => ({
  useLazyGetAppendedVideosQuery: () => [getAppendedVideos],
}));

function pendingRequest(id: number) {
  let resolve!: (detail: MovieDetail) => void;
  const promise = new Promise<MovieDetail>((done) => { resolve = done; });
  return {
    unwrap: () => promise,
    async finish() {
      await act(async () => resolve({ id, title: `Movie ${id}` } as MovieDetail));
    },
  };
}

describe("detail request ordering", () => {
  let view: ReturnType<typeof createTestRoot>;
  let consumer: DetailModalConsumerProps;
  let navigate: ReturnType<typeof useNavigate>;
  let first: ReturnType<typeof pendingRequest>;
  let second: ReturnType<typeof pendingRequest>;

  function Consumer() {
    consumer = useDetailModal();
    navigate = useNavigate();
    return null;
  }

  beforeEach(() => {
    view = createTestRoot();
    first = pendingRequest(1);
    second = pendingRequest(2);
    getAppendedVideos.mockReset().mockImplementation(({ id }) => id === 1 ? first : second);
    view.render(
      <MemoryRouter initialEntries={["/browse"]}>
        <DetailModalProvider><Consumer /></DetailModalProvider>
      </MemoryRouter>
    );
  });
  afterEach(() => view.unmount());

  function open(id: number) {
    act(() => { consumer.setDetailType({ id, mediaType: MEDIA_TYPE.Movie }); });
  }

  it("opens the requested movie when its response arrives", async () => {
    open(1);
    await first.finish();
    expect(consumer.detail.id).toBe(1);
    expect(consumer.detail.mediaDetail?.title).toBe("Movie 1");
  });

  it("keeps the latest selection when an older request finishes last", async () => {
    open(1);
    open(2);
    await second.finish();
    await first.finish();
    expect(consumer.detail.id).toBe(2);
    expect(consumer.detail.mediaDetail?.title).toBe("Movie 2");
  });

  it("does not reopen a closed modal when a pending response arrives", async () => {
    open(1);
    act(() => { consumer.setDetailType({}); });
    await first.finish();
    expect(consumer.detail.id).toBeUndefined();
    expect(consumer.detail.mediaDetail).toBeUndefined();
  });

  it("does not open a previous page's details after navigation", async () => {
    open(1);
    act(() => navigate("/genre/28"));
    await first.finish();
    expect(consumer.detail.id).toBeUndefined();
    expect(consumer.detail.mediaDetail).toBeUndefined();
  });
});
