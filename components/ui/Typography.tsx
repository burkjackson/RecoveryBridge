import React from 'react'

interface TypographyProps {
  children: React.ReactNode
  className?: string
}

export function Heading1({ children, className = '' }: TypographyProps) {
  return <h1 className={`heading-1 ${className}`}>{children}</h1>
}

export function Body16({ children, className = '' }: TypographyProps) {
  return <p className={`body-16 ${className}`}>{children}</p>
}

export function Body18({ children, className = '' }: TypographyProps) {
  return <p className={`body-18 ${className}`}>{children}</p>
}
