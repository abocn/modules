import { LICENSES } from "@/lib/validations/module"

/**
 * @constant LICENSE_LABELS
 * @description Mapping of license identifiers to human-readable labels
 * @type {Record<string, string>}
 */
export const LICENSE_LABELS: Record<string, string> = {
  "MIT": "MIT License",
  "Apache-2.0": "Apache License 2.0",
  "GPL-3.0": "GNU GPL v3.0",
  "GPL-2.0": "GNU GPL v2.0",
  "LGPL-3.0": "GNU LGPL v3.0",
  "LGPL-2.1": "GNU LGPL v2.1",
  "BSD-3-Clause": "BSD 3-Clause License",
  "BSD-2-Clause": "BSD 2-Clause License",
  "MPL-2.0": "Mozilla Public License 2.0",
  "ISC": "ISC License",
  "CC0-1.0": "Creative Commons CC0 1.0",
  "CC-BY-4.0": "Creative Commons Attribution 4.0",
  "CC-BY-SA-4.0": "Creative Commons Attribution-ShareAlike 4.0",
  "AGPL-3.0": "GNU Affero GPL v3.0",
  "Unlicense": "The Unlicense",
  "WTFPL": "Do What The F*ck You Want To Public License",
  "Proprietary": "Proprietary License",
  "Custom": "Custom License",
  "Other": "Other License"
}

/**
 * @function getLicenseLabel
 * @description Gets the human-readable label for a license identifier
 * @param {string} license - The license identifier
 * @returns {string} The human-readable label
 *
 * @example
 * ```typescript
 * getLicenseLabel("MIT") // Returns "MIT License"
 * getLicenseLabel("Custom") // Returns "Custom License"
 * ```
 */
export const getLicenseLabel = (license: string): string => {
  return LICENSE_LABELS[license] || license
}

/**
 * @interface LicenseOption
 * @description Represents a license option for use in comboboxes and selects
 * @property {string} value - The license identifier
 * @property {string} label - The human-readable label
 */
export interface LicenseOption {
  value: string
  label: string
}

/**
 * @function getLicenseOptions
 * @description Gets an array of license options for use in form components
 * @returns {LicenseOption[]} Array of license options
 *
 * @example
 * ```typescript
 * const options = getLicenseOptions()
 * // Returns [{ value: "MIT", label: "MIT License" }, ...]
 * ```
 */
export const getLicenseOptions = (): LicenseOption[] => {
  return LICENSES.map(license => ({
    value: license,
    label: getLicenseLabel(license)
  }))
}

/**
 * @function getLicenseOptionsWithAll
 * @description Gets license options with an "All Licenses" option for filtering
 * @returns {LicenseOption[]} Array of license options including "All" option
 *
 * @example
 * ```typescript
 * const options = getLicenseOptionsWithAll()
 * // Returns [{ value: "all", label: "All Licenses" }, { value: "MIT", label: "MIT License" }, ...]
 * ```
 */
export const getLicenseOptionsWithAll = (): LicenseOption[] => {
  return [
    { value: "all", label: "All Licenses" },
    ...getLicenseOptions()
  ]
}

/**
 * @function formatCustomLicense
 * @description Formats a custom license value for display
 * @param {string} customValue - The custom license value
 * @returns {string} The formatted license string
 *
 * @example
 * ```typescript
 * formatCustomLicense("My Custom License") // Returns "Custom: My Custom License"
 * formatCustomLicense("") // Returns "Custom License"
 * ```
 */
export const formatCustomLicense = (customValue: string): string => {
  return customValue.trim() ? `Custom: ${customValue.trim()}` : "Custom License"
}
