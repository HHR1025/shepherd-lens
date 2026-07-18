import { describe, expect, it } from "vitest";
import {
  clampSidebarPosition,
  normalizeSidebarPosition,
} from "./sidebar-preferences";

describe("sidebar position preferences", () => {
  it("accepts only finite stored coordinates", () => {
    expect(normalizeSidebarPosition({ left: 120, top: 80 })).toEqual({
      left: 120,
      top: 80,
    });
    expect(normalizeSidebarPosition({ left: Number.NaN, top: 80 })).toBeNull();
    expect(normalizeSidebarPosition("invalid")).toBeNull();
  });

  it("keeps a draggable portion of the sidebar inside the viewport", () => {
    expect(
      clampSidebarPosition(
        { left: -1000, top: -1000 },
        { width: 1280, height: 720 },
      ),
    ).toEqual({ left: -304, top: 16 });
    expect(
      clampSidebarPosition(
        { left: 2000, top: 2000 },
        { width: 1280, height: 720 },
      ),
    ).toEqual({ left: 1224, top: 664 });
  });
});
