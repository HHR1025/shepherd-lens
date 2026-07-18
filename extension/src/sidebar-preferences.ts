import { useEffect, useState } from "react";
import {
  LANGUAGE_STORAGE_KEY,
  nextLanguage,
  normalizeLanguage,
  type SidebarLanguage,
} from "./localization";

const POSITION_STORAGE_KEY = "shepherdLensSidebarPosition";
const DEFAULT_SIDEBAR_TOP = 96;
const SIDEBAR_WIDTH = 360;
const SIDEBAR_MIN_VISIBLE = 56;

export type SidebarPosition = {
  left: number;
  top: number;
};

export type SidebarViewport = {
  height: number;
  width: number;
};

export function useSidebarLanguage() {
  const [language, setLanguage] = useState<SidebarLanguage>("en");

  useEffect(() => {
    const storage = getChromeStorage();

    if (!storage) {
      return;
    }

    let active = true;

    storage
      .get([LANGUAGE_STORAGE_KEY])
      .then((result) => {
        if (active) {
          setLanguage(normalizeLanguage(result[LANGUAGE_STORAGE_KEY]));
        }
      })
      .catch((error) => reportRuntimeError("read language", error));

    return () => {
      active = false;
    };
  }, []);

  const toggleLanguage = () => {
    setLanguage((currentLanguage) => {
      const updatedLanguage = nextLanguage(currentLanguage);
      const storage = getChromeStorage();

      if (storage) {
        void storage
          .set({
            [LANGUAGE_STORAGE_KEY]: updatedLanguage,
          })
          .catch((error) => reportRuntimeError("save language", error));
      }

      return updatedLanguage;
    });
  };

  return { language, toggleLanguage };
}

export function useSidebarPosition() {
  const [position, setPosition] = useState<SidebarPosition>(() =>
    clampSidebarPosition({
      left: window.innerWidth - SIDEBAR_WIDTH - 16,
      top: DEFAULT_SIDEBAR_TOP,
    }),
  );

  useEffect(() => {
    const storage = getChromeStorage();

    if (!storage) {
      return;
    }

    let active = true;

    storage
      .get([POSITION_STORAGE_KEY])
      .then((result) => {
        const savedPosition = normalizeSidebarPosition(result[POSITION_STORAGE_KEY]);

        if (active && savedPosition) {
          setPosition(clampSidebarPosition(savedPosition));
        }
      })
      .catch((error) => reportRuntimeError("read sidebar position", error));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((currentPosition) => {
        const nextPosition = clampSidebarPosition(currentPosition);

        void saveSidebarPosition(nextPosition);

        return nextPosition;
      });
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const moveBy = (deltaX: number, deltaY: number) => {
    setPosition((currentPosition) => {
      const nextPosition = clampSidebarPosition({
        left: currentPosition.left + deltaX,
        top: currentPosition.top + deltaY,
      });

      void saveSidebarPosition(nextPosition);

      return nextPosition;
    });
  };

  return { moveBy, position };
}

export function normalizeSidebarPosition(value: unknown): SidebarPosition | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const position = value as SidebarPosition;

  if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) {
    return null;
  }

  return position;
}

export function clampSidebarPosition(
  position: SidebarPosition,
  viewport: SidebarViewport = {
    height: window.innerHeight,
    width: window.innerWidth,
  },
): SidebarPosition {
  const maxLeft = Math.max(SIDEBAR_MIN_VISIBLE, viewport.width - SIDEBAR_MIN_VISIBLE);
  const maxTop = Math.max(16, viewport.height - SIDEBAR_MIN_VISIBLE);

  return {
    left: Math.min(
      Math.max(-SIDEBAR_WIDTH + SIDEBAR_MIN_VISIBLE, position.left),
      maxLeft,
    ),
    top: Math.min(Math.max(16, position.top), maxTop),
  };
}

export function isInteractiveDragTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, select, textarea"));
}

export function reportRuntimeError(operation: string, error: unknown) {
  console.warn(`[Shepherd Lens] Failed to ${operation}.`, error);
}

function getChromeStorage() {
  if (typeof chrome === "undefined") {
    return null;
  }

  return chrome.storage?.local ?? null;
}

async function saveSidebarPosition(position: SidebarPosition) {
  const storage = getChromeStorage();

  if (!storage) {
    return;
  }

  try {
    await storage.set({
      [POSITION_STORAGE_KEY]: position,
    });
  } catch (error) {
    reportRuntimeError("save sidebar position", error);
  }
}
