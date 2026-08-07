"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { InputProps } from "@/components/ui/input";

interface Props {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: "new-password" | "current-password";
    describedBy?: string;
    invalid?: boolean;
    placeholder?: string;
    inputSize?: InputProps["inputSize"];
}

export function PasswordField({
    id, label, value, onChange, autoComplete, describedBy, invalid, placeholder,
    inputSize = "default",
}: Props) {
    const [visible, setVisible] = useState(false);
    const large = inputSize === "lg";

    return (
        <div className={large ? "mt-5" : "mt-4"}>
            <label htmlFor={id} className="block text-sm font-medium text-foreground">
                {label}
            </label>
            <div className={large ? "relative mt-2" : "relative mt-1.5"}>
                <Input
                    id={id}
                    name={id}
                    type={visible ? "text" : "password"}
                    autoComplete={autoComplete}
                    inputSize={inputSize}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    className={large ? "pr-12" : "pr-10"}
                    required
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    className={`absolute inset-y-0 right-0 flex items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${large ? "w-12" : "w-10"}`}
                >
                    {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
                </button>
            </div>
        </div>
    );
}
