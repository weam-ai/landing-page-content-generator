import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import config from '../config/frontend-config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ONE PLACE TO CHANGE BASE URL - Just update this and everything works!
const BASE_URL = config.basePath

// Super simple - just use this everywhere
export const api = (path: string) => `${BASE_URL}/api${path.startsWith('/') ? path : `/${path}`}`
