/**
 * Application constants for consistent values across the platform
 */

export const FINANCIAL_CONSTANTS = {
  // Currency formatting
  CURRENCY: {
    DEFAULT_LOCALE: 'en-US',
    DEFAULT_CURRENCY: 'USD',
    DEFAULT_DECIMALS: 0
  },

  // Percentage thresholds
  THRESHOLDS: {
    ROIC: {
      EXCELLENT: 20,
      GOOD: 15,
      ADEQUATE: 10
    },
    FCF_YIELD: {
      EXCELLENT: 8,
      GOOD: 6,
      ADEQUATE: 4
    },
    LEVERAGE: {
      EXCELLENT: 1,
      GOOD: 2,
      ADEQUATE: 3
    }
  },

  // Regulatory thresholds
  REGULATORY: {
    CET1: {
      MINIMUM: 7.0,
      COMPANY_ACTION: 150,
      REGULATORY_ACTION: 100,
      MANDATORY_CONTROL: 70
    },
    RBC: {
      MINIMUM: 200,
      COMPANY_ACTION: 150,
      REGULATORY_ACTION: 100,
      MANDATORY_CONTROL: 70
    }
  },

  // Risk weights for banking
  RISK_WEIGHTS: {
    CASH: 0,
    TREASURY: 0,
    AGENCY_MBS: 20,
    RESIDENTIAL_MORTGAGES: 50,
    COMMERCIAL_LOANS: 100,
    CORPORATE_BONDS: 100,
    DERIVATIVES: 50
  },

  // Default values
  DEFAULTS: {
    DISCOUNT_RATE: 10,
    GROWTH_RATE: 8,
    MARGIN_OF_SAFETY: 25,
    TERMINAL_GROWTH_RATE: 3
  }
} as const

export const UI_CONSTANTS = {
  // Animation durations
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },

  // Layout dimensions
  LAYOUT: {
    SIDEBAR_WIDTH: 280,
    HEADER_HEIGHT: 64,
    FOOTER_HEIGHT: 40
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100
  },

  // Debounce delays
  DEBOUNCE: {
    SEARCH: 300,
    API_CALL: 500
  }
} as const

export const VALIDATION_RULES = {
  // Input validation
  INPUT: {
    MAX_QUERY_LENGTH: 500,
    MIN_COMPANY_NAME_LENGTH: 2,
    MAX_COMPANY_NAME_LENGTH: 100
  },

  // Business rules
  BUSINESS: {
    MAX_SELECTED_COMPANIES: 5,
    MIN_PORTFOLIO_WEIGHT: 0.1,
    MAX_PORTFOLIO_WEIGHT: 25
  }
} as const

export const API_ENDPOINTS = {
  // Base URLs
  BASE: {
    DEVELOPMENT: '/api',
    PRODUCTION: 'https://api.madlab.com'
  },

  // Specific endpoints
  ENDPOINTS: {
    COMPANIES: '/companies',
    SCREENERS: '/screeners',
    VALUATION: '/valuation',
    PORTFOLIO: '/portfolio',
    ANALYTICS: '/analytics'
  }
} as const

export const STORAGE_KEYS = {
  // Local storage
  LOCAL: {
    USER_PREFERENCES: 'madlab_user_preferences',
    RECENT_SEARCHES: 'madlab_recent_searches',
    WORKFLOW_STATE: 'valor-workflow-state'
  },

  // Session storage
  SESSION: {
    CURRENT_SESSION: 'madlab_current_session',
    TEMP_DATA: 'madlab_temp_data'
  }
} as const

export const ERROR_MESSAGES = {
  // Common errors
  COMMON: {
    NETWORK_ERROR: 'Network request failed. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access to this resource is forbidden.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'An internal server error occurred.',
    VALIDATION_ERROR: 'Please check your input and try again.'
  },

  // Specific errors
  SPECIFIC: {
    QUERY_TOO_LONG: 'Query is too long. Please use fewer than 500 characters.',
    NO_COMPANIES_SELECTED: 'Please select at least one company to proceed.',
    INVALID_COMPANY_DATA: 'Invalid company data provided.',
    CALCULATION_ERROR: 'Error performing calculation. Please check your inputs.'
  }
} as const

export const SUCCESS_MESSAGES = {
  // Success states
  COMMON: {
    DATA_SAVED: 'Data saved successfully.',
    ANALYSIS_COMPLETE: 'Analysis completed successfully.',
    EXPORT_SUCCESS: 'Data exported successfully.'
  }
} as const

export default {
  FINANCIAL_CONSTANTS,
  UI_CONSTANTS,
  VALIDATION_RULES,
  API_ENDPOINTS,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
}
