export type TestStatus = 'pass' | 'fail' | 'skip'

export interface ComplianceViolation {
  impact?: string
  summary?: string
  [key: string]: unknown
}

type MetadataPrimitive = string | number | boolean | null | undefined

export type TestMetadata = Record<string, MetadataPrimitive | MetadataPrimitive[]>

export interface BasicTestResult {
  name: string
  status: TestStatus
  duration?: number
  error?: string
  violations?: ComplianceViolation[]
  metadata?: TestMetadata
}

export interface AccessibilityTestResult extends BasicTestResult {
  score?: number
  wcagLevel?: string
}

export interface BrowserTestResult extends BasicTestResult {
  browser?: string
  version?: string
}

export interface ResponsiveTestResult extends BasicTestResult {
  viewport?: string
}

export interface UsabilityTestResult extends BasicTestResult {
  persona?: string
  findings?: string[]
}

export type GenericTestResult =
  | AccessibilityTestResult
  | BrowserTestResult
  | ResponsiveTestResult
  | UsabilityTestResult
  | BasicTestResult
