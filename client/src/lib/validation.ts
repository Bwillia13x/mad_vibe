/**
 * Validation utilities for form inputs and business logic
 */

import { VALIDATION_RULES } from './constants'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface ValidationRule {
  test: (value: any) => boolean
  message: string
  level: 'error' | 'warning'
}

// Common validation rules
export const createRequiredRule = (fieldName: string): ValidationRule => ({
  test: (value: any) => value !== null && value !== undefined && value !== '',
  message: `${fieldName} is required`,
  level: 'error'
})

export const createMinLengthRule = (fieldName: string, minLength: number): ValidationRule => ({
  test: (value: string) => value.length >= minLength,
  message: `${fieldName} must be at least ${minLength} characters`,
  level: 'error'
})

export const createMaxLengthRule = (fieldName: string, maxLength: number): ValidationRule => ({
  test: (value: string) => value.length <= maxLength,
  message: `${fieldName} must be no more than ${maxLength} characters`,
  level: 'error'
})

export const createRangeRule = (fieldName: string, min: number, max: number): ValidationRule => ({
  test: (value: number) => value >= min && value <= max,
  message: `${fieldName} must be between ${min} and ${max}`,
  level: 'error'
})

export const createPositiveNumberRule = (fieldName: string): ValidationRule => ({
  test: (value: number) => value > 0,
  message: `${fieldName} must be a positive number`,
  level: 'error'
})

export const createPercentageRule = (fieldName: string): ValidationRule => ({
  test: (value: number) => value >= 0 && value <= 100,
  message: `${fieldName} must be between 0 and 100`,
  level: 'error'
})

// Validation functions
export const validateTextInput = (value: string, fieldName: string): ValidationResult => {
  const rules: ValidationRule[] = [
    createRequiredRule(fieldName),
    createMinLengthRule(fieldName, VALIDATION_RULES.INPUT.MIN_COMPANY_NAME_LENGTH),
    createMaxLengthRule(fieldName, VALIDATION_RULES.INPUT.MAX_COMPANY_NAME_LENGTH)
  ]

  return runValidationRules(value, rules)
}

export const validatePercentage = (value: number, fieldName: string): ValidationResult => {
  const rules: ValidationRule[] = [createRequiredRule(fieldName), createPercentageRule(fieldName)]

  return runValidationRules(value, rules)
}

export const validateCurrency = (value: number, fieldName: string): ValidationResult => {
  const rules: ValidationRule[] = [
    createRequiredRule(fieldName),
    createPositiveNumberRule(fieldName)
  ]

  return runValidationRules(value, rules)
}

export const validateQuery = (query: string): ValidationResult => {
  const rules: ValidationRule[] = [
    createRequiredRule('Query'),
    createMaxLengthRule('Query', VALIDATION_RULES.INPUT.MAX_QUERY_LENGTH)
  ]

  return runValidationRules(query, rules)
}

export const validateCompanySelection = (selectedCount: number): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (selectedCount === 0) {
    errors.push('Please select at least one company to proceed.')
  }

  if (selectedCount > VALIDATION_RULES.BUSINESS.MAX_SELECTED_COMPANIES) {
    errors.push(
      `Please select no more than ${VALIDATION_RULES.BUSINESS.MAX_SELECTED_COMPANIES} companies.`
    )
  }

  if (selectedCount === VALIDATION_RULES.BUSINESS.MAX_SELECTED_COMPANIES) {
    warnings.push('You have reached the maximum number of companies for this analysis.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

// Helper function to run validation rules
export const runValidationRules = (value: any, rules: ValidationRule[]): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  rules.forEach((rule) => {
    if (!rule.test(value)) {
      if (rule.level === 'error') {
        errors.push(rule.message)
      } else {
        warnings.push(rule.message)
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

// Form validation helper
export const validateForm = (
  formData: Record<string, any>,
  validationSchema: Record<string, ValidationRule[]>
): ValidationResult => {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  Object.entries(validationSchema).forEach(([fieldName, rules]) => {
    const result = runValidationRules(formData[fieldName], rules)
    allErrors.push(...result.errors)
    if (result.warnings) {
      allWarnings.push(...result.warnings)
    }
  })

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings.length > 0 ? allWarnings : undefined
  }
}

// Real-time validation hook helper
export const useFieldValidation = (value: any, rules: ValidationRule[]) => {
  return runValidationRules(value, rules)
}

export default {
  validateTextInput,
  validatePercentage,
  validateCurrency,
  validateQuery,
  validateCompanySelection,
  validateForm,
  useFieldValidation,
  createRequiredRule,
  createMinLengthRule,
  createMaxLengthRule,
  createRangeRule,
  createPositiveNumberRule,
  createPercentageRule
}
