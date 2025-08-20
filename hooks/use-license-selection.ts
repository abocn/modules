"use client"

import { useState, useCallback } from "react"
import { formatCustomLicense } from "@/lib/utils/license-utils"

/**
 * @interface UseLicenseSelectionReturn
 * @description Return type for the useLicenseSelection hook
 * @property {string} license - Currently selected license
 * @property {string} customLicense - Custom license value
 * @property {string} formattedLicense - Formatted license for storage/display
 * @property {(license: string, customValue?: string) => void} setLicense - Function to set license
 * @property {(customValue: string) => void} setCustomLicense - Function to set custom license
 * @property {() => void} clearLicense - Function to clear all license data
 * @property {boolean} isCustom - Whether custom license is selected
 * @property {boolean} isValid - Whether the current license selection is valid
 */
interface UseLicenseSelectionReturn {
  license: string
  customLicense: string
  formattedLicense: string
  setLicense: (license: string, customValue?: string) => void
  setCustomLicense: (customValue: string) => void
  clearLicense: () => void
  isCustom: boolean
  isValid: boolean
}

/**
 * @interface UseLicenseSelectionOptions
 * @description Options for the useLicenseSelection hook
 * @property {string} [initialLicense] - Initial license value
 * @property {string} [initialCustomLicense] - Initial custom license value
 * @property {boolean} [required] - Whether license selection is required
 */
interface UseLicenseSelectionOptions {
  initialLicense?: string
  initialCustomLicense?: string
  required?: boolean
}

/**
 * @hook useLicenseSelection
 * @description Custom hook for managing license selection state with custom license support
 * @param {UseLicenseSelectionOptions} [options] - Hook options
 * @returns {UseLicenseSelectionReturn} License selection state and handlers
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const {
 *     license,
 *     customLicense,
 *     formattedLicense,
 *     setLicense,
 *     setCustomLicense,
 *     isCustom,
 *     isValid
 *   } = useLicenseSelection({ required: true })
 *
 *   return (
 *     <LicenseCombobox
 *       value={license}
 *       onValueChange={setLicense}
 *       customValue={customLicense}
 *       onCustomValueChange={setCustomLicense}
 *       required
 *     />
 *   )
 * }
 * ```
 */
export function useLicenseSelection(options: UseLicenseSelectionOptions = {}): UseLicenseSelectionReturn {
  const {
    initialLicense = "",
    initialCustomLicense = "",
    required = false
  } = options

  const [license, setLicenseState] = useState(initialLicense)
  const [customLicense, setCustomLicenseState] = useState(initialCustomLicense)

  /**
   * @function setLicense
   * @description Sets the license value and optionally the custom license value
   * @param {string} newLicense - The new license value
   * @param {string} [customValue] - Optional custom license value
   */
  const setLicense = useCallback((newLicense: string, customValue?: string) => {
    setLicenseState(newLicense)

    if (newLicense !== "Custom") {
      setCustomLicenseState("")
    } else if (customValue !== undefined) {
      setCustomLicenseState(customValue)
    }
  }, [])

  /**
   * @function setCustomLicense
   * @description Sets the custom license value
   * @param {string} customValue - The custom license value
   */
  const setCustomLicense = useCallback((customValue: string) => {
    setCustomLicenseState(customValue)
  }, [])

  /**
   * @function clearLicense
   * @description Clears all license data
   */
  const clearLicense = useCallback(() => {
    setLicenseState("")
    setCustomLicenseState("")
  }, [])

  /**
   * @computed isCustom
   * @description Whether custom license is currently selected
   */
  const isCustom = license === "Custom"

  /**
   * @computed isValid
   * @description Whether the current license selection is valid
   */
  const isValid = !required || (Boolean(license) && license.length > 0 && (!isCustom || customLicense.trim().length > 0))

  /**
   * @computed formattedLicense
   * @description Formatted license string for storage or API submission
   */
  const formattedLicense = isCustom && customLicense.trim() 
    ? formatCustomLicense(customLicense)
    : license

  return {
    license,
    customLicense,
    formattedLicense,
    setLicense,
    setCustomLicense,
    clearLicense,
    isCustom,
    isValid
  }
}