"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: "new-password" | "current-password";
    describedBy?: string;
    invalid?: boolean;
}

export function PasswordField({
    id, label, value, onChange, autoComplete, describedBy, invalid,
}: Props) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="mt-4">
            <label htmlFor={id} className="block text-sm font-medium text-foreground">
                {label}
            </label>
            <div className="relative mt-1.5">
                <Input
                    id={id}
                    name={id}
                    type={visible ? "text" : "password"}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    className="pr-10"
                    required
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
            </div>
        </div>
    );
}