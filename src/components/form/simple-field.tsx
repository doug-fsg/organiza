"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface SimpleFieldProps {
  id: string
  label: string
  description?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactElement
}

/**
 * Campo de formulário sem react-hook-form: label, texto auxiliar e erro com ids estáveis para leitores de tela.
 * Passe um único filho (ex.: `<Input />`) que aceite id e atributos ARIA.
 */
export function SimpleField({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
}: SimpleFieldProps) {
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const describedBy = [description ? descriptionId : null, Error ? errorId : null].filter(Boolean).join(" ")

  const control = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy.length > 0 ? describedBy : undefined,
    "aria-required": required ? true : undefined,
  })

  return (
    <div className={cn("grid gap-2", className)} data-slot="simple-field">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive ml-0.5" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {control}
      {description && !error ? (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
