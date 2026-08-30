import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";

interface NumberInputProps extends Omit<InputProps, "type" | "value" | "onChange"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}

export function NumberInput({ value, onChange, min = 0, step, onFocus, onBlur, ...props }: NumberInputProps) {
  const [display, setDisplay] = React.useState(String(value));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setDisplay(String(value));
  }, [value, focused]);

  return (
    <Input
      {...props}
      type="number"
      min={min}
      step={step}
      value={focused ? display : value}
      onFocus={(e) => {
        setFocused(true);
        if (value === 0) setDisplay("");
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        const parsed = display === "" ? 0 : Number(display);
        onChange(Number.isFinite(parsed) ? Math.max(min, parsed) : 0);
        onBlur?.(e);
      }}
      onChange={(e) => {
        setDisplay(e.target.value);
        const parsed = e.target.value === "" ? 0 : Number(e.target.value);
        if (Number.isFinite(parsed)) onChange(Math.max(min, parsed));
      }}
    />
  );
}
