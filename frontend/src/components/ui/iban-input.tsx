import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'

// Utility function to format any string as a Turkish IBAN
// e.g. TRxx xxxx xxxx xxxx xxxx xxxx xx
export function formatIban(value: string): string {
  // Clean all characters except digits/letters
  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (!clean) return ''
  
  let formatted = clean
  // If it starts with digits, default to prepending TR
  if (/^\d/.test(clean)) {
    formatted = 'TR' + clean
  }
  
  // Limit to 26 characters (standard Turkish IBAN length)
  formatted = formatted.substring(0, 26)
  
  // Group in sets of 4
  const parts = []
  if (formatted.length > 0) {
    parts.push(formatted.substring(0, 4))
  }
  for (let i = 4; i < formatted.length; i += 4) {
    parts.push(formatted.substring(i, i + 4))
  }
  
  return parts.join(' ')
}

export interface IbanInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value?: string
  onChange?: (value: string) => void
}

function IbanInput({ className, value = '', onChange, ...props }: IbanInputProps) {
  const [displayValue, setDisplayValue] = React.useState(() => formatIban(value))

  React.useEffect(() => {
    setDisplayValue(formatIban(value))
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    const formatted = formatIban(rawVal)
    setDisplayValue(formatted)
    
    if (onChange) {
      // Pass the clean value without spaces back to parent
      const cleanVal = formatted.replace(/\s/g, '')
      onChange(cleanVal)
    }
  }

  return (
    <Input
      type="text"
      data-slot="iban-input"
      className={cn('font-mono tracking-wider', className)}
      value={displayValue}
      onChange={handleInputChange}
      placeholder="TR00 0000 0000 0000 0000 0000 00"
      {...props}
    />
  )
}

export { IbanInput }
