import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"
import { SelectHTMLAttributes, forwardRef, useId } from "react"

export type NativeSelectProps = {
  placeholder?: string
  /** Visible label; defaults to the placeholder so the field is always named. */
  label?: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
} & SelectHTMLAttributes<HTMLSelectElement>

/** Native select with a visible label, styled like the text inputs. */
const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      placeholder = "Select...",
      label,
      defaultValue,
      className,
      children,
      id,
      errors: _errors,
      touched: _touched,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const selectId = id ?? `select-${generatedId}`

    return (
      <div className="flex w-full flex-col gap-1.5">
        <label htmlFor={selectId} className="text-xs text-muted-foreground">
          {label ?? placeholder}
          {props.required && (
            <span aria-hidden className="text-destructive-foreground">
              {" "}*
            </span>
          )}
        </label>
        <div className={cn("relative", className)}>
          <select
            ref={ref}
            id={selectId}
            defaultValue={defaultValue}
            {...props}
            className="h-11 w-full appearance-none border border-input bg-card pr-10 pl-3 text-sm outline-none transition-colors hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50"
          >
            <option disabled value="">
              {placeholder}
            </option>
            {children}
          </select>
          <ChevronDownIcon
            className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground"
            aria-hidden
          />
        </div>
      </div>
    )
  }
)

NativeSelect.displayName = "NativeSelect"

export default NativeSelect
