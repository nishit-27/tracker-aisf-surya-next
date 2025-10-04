"use client";

import Switch from "react-switch";

const sizeMap = {
  sm: { height: 18, width: 34, handle: 14 },
  md: { height: 22, width: 44, handle: 18 },
  lg: { height: 26, width: 52, handle: 22 },
};

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = "md",
  offColor = "#1f2937",
  onColor = "#38bdf8",
  offHandleColor = "#64748b",
  onHandleColor = "#0f172a",
  className = "",
}) {
  const dimensions = sizeMap[size] || sizeMap.md;

  return (
    <div className={className}>
      <Switch
        checked={Boolean(checked)}
        onChange={onChange}
        disabled={disabled}
        onColor={onColor}
        offColor={offColor}
        onHandleColor={onHandleColor}
        offHandleColor={offHandleColor}
        handleDiameter={dimensions.handle}
        height={dimensions.height}
        width={dimensions.width}
        uncheckedIcon={false}
        checkedIcon={false}
        boxShadow="0 2px 6px rgba(0,0,0,0.25)"
        activeBoxShadow="0 0 1px 6px rgba(56,189,248,0.3)"
      />
    </div>
  );
}
