import { cn } from "@/lib/utils"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import React, { useId, useImperativeHandle, useState } from "react"

type InputProps = Omit<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  "placeholder"
> & {
  label: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
  name: string
  topLabel?: string
}

/**
 * Labelled text field used by checkout and account forms. The label is always
 * visible above the field and tied to it with `htmlFor`.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { type, name, label, touched: _touched, errors: _errors, required, topLabel, id, className, ...props },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [showPassword, setShowPassword] = useState(false)
    const generatedId = useId()
    const inputId = id ?? `${name}-${generatedId}`
    const isPassword = type === "password"

    useImperativeHandle(ref, () => inputRef.current!)

    return (
      <div className="flex w-full flex-col gap-1.5">
        {topLabel && <span className="text-sm font-medium">{topLabel}</span>}
        <label htmlFor={inputId} className="text-xs text-muted-foreground">
          {label}
          {required && (
            <span aria-hidden className="text-destructive-foreground">
              {" "}*
            </span>
          )}
        </label>
        <div className="relative">
          <input
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            name={name}
            required={required}
            className={cn(
              "block h-11 w-full border border-input bg-card px-3 text-sm outline-none transition-colors",
              "hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
              "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
              isPassword && "pr-11",
              className
            )}
            {...props}
            ref={inputRef}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
            >
              {showPassword ? <EyeOffIcon className="size-4" aria-hidden /> : <EyeIcon className="size-4" aria-hidden />}
            </button>
          )}
        </div>
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
