"use client"

import { cloneElement, type ReactElement } from "react"

type ControlProps = React.InputHTMLAttributes<HTMLInputElement> &
  React.SelectHTMLAttributes<HTMLSelectElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>

interface FormFieldProps {
  id: string
  label: string
  error?: string
  disabled?: boolean
  inputClassName?: string
  children: ReactElement<ControlProps>
}

export function FormField({
  id,
  label,
  error,
  disabled,
  inputClassName,
  children,
}: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined
  const inputCls =
    inputClassName ??
    `w-full px-3 py-2 border rounded-lg text-sm mt-1${disabled ? " disabled:bg-zinc-100" : ""}`

  return (
    <div>
      <label htmlFor={id} className="text-xs text-zinc-500">
        {label}
      </label>
      {cloneElement(children, {
        id,
        disabled: disabled ?? children.props.disabled,
        className: [inputCls, children.props.className].filter(Boolean).join(" "),
        "aria-invalid": error ? true : undefined,
        "aria-describedby": errorId,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-500 mt-1">
          {error}
        </p>
      ) : null}
    </div>
  )
}
