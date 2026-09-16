import React from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Chevron button that rotates to reflect expanded/collapsed state. Each
 * dashboard card has its own bespoke header layout, so this is a small
 * building block to drop into that header rather than a component that
 * renders a whole header itself.
 *
 * Stops propagation on its own click so it can sit inside a header that is
 * itself clickable (the whole header toggles too, for a bigger tap target
 * on mobile) without double-firing the toggle.
 */
export function CollapseToggleButton({ expanded, onToggle }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-expanded={expanded}
      aria-label={expanded ? t("common.collapseSection") : t("common.expandSection")}
      className="collapse-toggle-btn"
    >
      <ChevronDown
        size={18}
        style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.25s ease" }}
      />
    </button>
  );
}

/**
 * Animates open/closed via CSS grid-template-rows (0fr <-> 1fr, see
 * index.css) rather than a JS-measured max-height. That works correctly for
 * content of any height - including recharts panels, whose own internal
 * ResizeObserver re-measures once the row actually grows - without needing
 * to remeasure by hand on every resize.
 */
export function CollapsibleBody({ expanded, children }) {
  return (
    <div className={`collapsible-body${expanded ? " expanded" : ""}`}>
      <div className="collapsible-body-inner">
        {children}
      </div>
    </div>
  );
}

/**
 * Makes its wrapped header clickable/keyboard-toggleable as a whole (bigger
 * tap target than the chevron alone), while staying a plain <div> so a real
 * <button> elsewhere in the same header (e.g. RecommendationCard's Print
 * button) keeps working as its own separate control.
 */
export function CollapsibleHeader({ expanded, onToggle, style, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{ cursor: "pointer", ...style }}
    >
      {children}
    </div>
  );
}
