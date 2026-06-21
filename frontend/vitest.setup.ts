import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "@/tests/mocks/server";
import { resetAdvisoryMockState } from "@/tests/mocks/handlers";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterEach(() => {
  cleanup();
  resetAdvisoryMockState();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
