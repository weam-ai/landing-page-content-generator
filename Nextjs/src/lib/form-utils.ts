import { cn } from "@/lib/utils"

/**
 * Common utility to remove focus rings and focus-visible styles from form elements
 * This ensures consistent styling across all form fields without focus rings
 */
export const removeFocusRing = (className?: string) => {
  return cn(
    // Remove all focus ring styles
    "focus:ring-0",
    "focus-visible:ring-0", 
    "focus:ring-offset-0",
    "focus-visible:ring-offset-0",
    "focus:outline-none",
    "focus-visible:outline-none",
    // Keep the base styling
    className
  )
}

/**
 * Common form field base styles without focus rings
 */
export const formFieldBaseStyles = "focus:ring-0 focus-visible:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none"

/**
 * Enhanced form field styles with no focus rings
 */
export const getFormFieldStyles = (baseStyles: string, additionalStyles?: string) => {
  return cn(
    formFieldBaseStyles,
    baseStyles,
    additionalStyles
  )
}
