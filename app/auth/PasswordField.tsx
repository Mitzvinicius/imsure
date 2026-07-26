'use client';
import { useState } from "react";
import { Icon } from "./icons";

export function PasswordField({
    label, value, onChange, placeholder, error, showStrength,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    error?: string;
    showStrength?: boolean;
}) {
    const [show, setShow] = useState(false);
    const score = showStrength
        ? Math.min(3, [value.length >= 8, /[A-Z]/.test(value), /[0-9]/.test(value)].filter(Boolean).length)
        : 0;

    return (
        <div className="field">
            <label>{label}</label>
            <div className="input-wrap has-ic has-toggle">
                <span className="lead-ic"><Icon name="lock" size={17} /></span>
                <input
                    className={"input" + (error ? " err" : "")}
                    type={show ? "text" : "password"}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} tabIndex={-1} aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
                    <Icon name={show ? "eyeOff" : "eye"} size={18} />
                </button>
            </div>
            {error && <p className="field-error">{error}</p>}
            {showStrength && value && (
                <div className="strength">
                    <i className={score >= 1 ? "on1" : ""}></i>
                    <i className={score >= 2 ? "on2" : ""}></i>
                    <i className={score >= 3 ? "on3" : ""}></i>
                </div>
            )}
        </div>
    );
}
