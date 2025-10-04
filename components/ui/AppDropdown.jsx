"use client";

import { useCallback, useMemo } from "react";
import { Dropdown } from "primereact/dropdown";
import { ChevronDown, X } from "lucide-react";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AppDropdown({
  value,
  options = [],
  onChange,
  placeholder = "Select...",
  className = "",
  panelClassName = "",
  optionLabel = "label",
  optionValue = "value",
  disabled = false,
  editable = false,
  showClear = false,
  appendTo,
  dropdownIcon,
  emptyMessage = "No options available",
  ...rest
}) {
  const handleChange = useCallback(
    (event) => {
      if (typeof onChange === "function") {
        onChange(event.value, event);
      }
    },
    [onChange],
  );

  const resolvedAppendTo = useMemo(() => {
    if (appendTo !== undefined) {
      return appendTo;
    }
    if (typeof window === "undefined") {
      return undefined;
    }
    return document.body;
  }, [appendTo]);

  const rootClasses = joinClasses(
    "app-dropdown inline-flex min-h-[40px] min-w-[160px] items-center gap-2 rounded-2xl border border-white/10 bg-[#111327] px-4 text-sm text-white transition",
    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-white/25",
    "focus-within:border-sky-500 focus-within:shadow-[0_0_0_1px_rgba(14,165,233,0.35)]",
    className,
  );

  const panelClasses = joinClasses(
    "app-dropdown-panel rounded-2xl border border-white/10 bg-[#0f172a] p-2 shadow-[0_24px_60px_rgba(8,11,24,0.65)]",
    panelClassName,
  );

  const basePT = useMemo(
    () => ({
      root: { className: rootClasses },
      input: {
        className:
          "flex-1 bg-transparent text-sm font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none",
      },
      trigger: {
        className: "text-slate-400 transition hover:text-slate-200",
      },
      panel: {
        className: panelClasses,
      },
      list: {
        className: "max-h-64 space-y-1 overflow-y-auto py-1",
      },
      item: ({ context }) => ({
        className: joinClasses(
          "flex cursor-pointer items-center rounded-xl px-3 py-2 text-sm transition",
          context.focused ? "bg-white/10 text-white" : "text-slate-200",
          context.selected ? "bg-sky-500/20 text-sky-200" : "",
          context.disabled ? "opacity-60" : "",
        ),
      }),
      emptyMessage: {
        className: "px-3 py-2 text-sm text-slate-400",
      },
      filterInput: {
        className:
          "w-full rounded-xl border border-white/10 bg-[#111327] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none",
      },
      header: {
        className: "px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500",
      },
      footer: {
        className: "px-3 pt-2 text-xs text-slate-500",
      },
      clearIcon: {
        className: "text-slate-400 transition hover:text-slate-100",
      },
    }),
    [panelClasses, rootClasses],
  );

  return (
    <Dropdown
      value={value}
      options={options}
      onChange={handleChange}
      optionLabel={optionLabel}
      optionValue={optionValue}
      placeholder={placeholder}
      disabled={disabled}
      editable={editable}
      showClear={showClear}
      appendTo={resolvedAppendTo}
      dropdownIcon={dropdownIcon ?? <ChevronDown className="h-4 w-4" />}
      clearIcon={<X className="h-3.5 w-3.5" />}
      emptyMessage={emptyMessage}
      pt={basePT}
      unstyled
      {...rest}
    />
  );
}

