import React from 'react'

interface TypographyProps {
  children: React.ReactNode
  className?: string
}

// Semantic type scale. Prefer these components over ad-hoc text-2xl/text-3xl so
// heading hierarchy stays consistent across the app. Sizes/weights are defined
// as fontSize tokens in tailwind.config.js and the matching utility classes in
// globals.css (display / heading-1..4 / body-18 / body-16 / body-14 / caption).

export function Display({ children, className = '' }: TypographyProps) {
  return <h1 className={`display ${className}`}>{children}</h1>
}

export function Heading1({ children, className = '' }: TypographyProps) {
  return <h1 className={`heading-1 ${className}`}>{children}</h1>
}

export function Heading2({ children, className = '' }: TypographyProps) {
  return <h2 className={`heading-2 ${className}`}>{children}</h2>
}

export function Heading3({ children, className = '' }: TypographyProps) {
  return <h3 className={`heading-3 ${className}`}>{children}</h3>
}

export function Heading4({ children, className = '' }: TypographyProps) {
  return <h4 className={`heading-4 ${className}`}>{children}</h4>
}

export function Body18({ children, className = '' }: TypographyProps) {
  return <p className={`body-18 ${className}`}>{children}</p>
}

export function Body16({ children, className = '' }: TypographyProps) {
  return <p className={`body-16 ${className}`}>{children}</p>
}

export function Body14({ children, className = '' }: TypographyProps) {
  return <p className={`body-14 ${className}`}>{children}</p>
}

export function Caption({ children, className = '' }: TypographyProps) {
  return <p className={`caption ${className}`}>{children}</p>
}
