import { getCopy, type SidebarLanguage } from "../localization";

export type SidebarView = "overview" | "evidence";

export function ViewTabs({
  activeView,
  language,
  onChange,
}: {
  activeView: SidebarView;
  language: SidebarLanguage;
  onChange: (view: SidebarView) => void;
}) {
  const copy = getCopy(language);

  return (
    <div className="grid grid-cols-2 rounded-lg border border-white/8 bg-white/[0.025] p-1">
      {(["overview", "evidence"] as const).map((view) => (
        <button
          className={[
            "min-w-0 rounded-md px-2 py-1.5 text-[12px] font-medium leading-4 transition",
            activeView === view
              ? "bg-white/10 text-stone-100 shadow-sm"
              : "text-stone-500 hover:bg-white/[0.045] hover:text-stone-300",
          ].join(" ")}
          key={view}
          type="button"
          aria-pressed={activeView === view}
          onClick={() => onChange(view)}
        >
          {copy.views[view]}
        </button>
      ))}
    </div>
  );
}
