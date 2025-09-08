import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ONE PLACE TO CHANGE BASE URL - Just update this and everything works!
const BASE_URL = process.env.NEXT_PUBLIC_BASE_PATH || '/ai-landing-page-app'

// Super simple - just use this everywhere
export const api = (path: string) => `${BASE_URL}/api${path.startsWith('/') ? path : `/${path}`}`
