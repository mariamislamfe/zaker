import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
}

export function Input({ label, error, hint, leftIcon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          {...props}
          className={[
            'w-full rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-colors duration-150 text-sm py-2 pr-3',
            leftIcon ? 'pl-10' : 'pl-3',
            error
              ? 'border-red-400 dark:border-red-600'
              : 'border-zinc-300 dark:border-zinc-700',
            className,
          ].join(' ')}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        {...props}
        className={[
          'w-full rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
          'placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500',
          'focus:border-transparent transition-colors duration-150 text-sm px-3 py-2 resize-none',
          error ? 'border-red-400' : 'border-zinc-300 dark:border-zinc-700',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
