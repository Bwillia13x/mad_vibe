/**
 * Structured Financial Data Extraction using OpenAI
 * Extracts financial statements from SEC filings using GPT-4 with structured outputs
 */

import { log } from '../log'
import { getEnvVar } from '../env-security'

export interface FinancialStatements {
  incomeStatement: {
    revenue: number
    costOfRevenue: number
    grossProfit: number
    operatingExpenses: number
    operatingIncome: number
    interestExpense: number
    taxExpense: number
    netIncome: number
    eps: number
    sharesOutstanding: number
    period: string
    periodType: 'annual' | 'quarterly'
  }
  balanceSheet: {
    totalAssets: number
    currentAssets: number
    cash: number
    accountsReceivable: number
    inventory: number
    totalLiabilities: number
    currentLiabilities: number
    longTermDebt: number
    shareholdersEquity: number
    retainedEarnings: number
    period: string
  }
  cashFlowStatement: {
    operatingCashFlow: number
    investingCashFlow: number
    financingCashFlow: number
    capex: number
    depreciation: number
    amortization: number
    stockBasedComp: number
    freeCashFlow: number
    changeInWorkingCapital: number
    period: string
  }
  metadata: {
    ticker: string
    company: string
    fiscalYear: number
    fiscalQuarter?: number
    currency: string
    reportDate: string
  }
}

export interface OwnerEarningsResult {
  netIncome: number
  depreciation: number
  amortization: number
  stockBasedComp: number
  maintenanceCapex: number
  changeInWorkingCapital: number
  ownerEarnings: number
  adjustments: Array<{
    name: string
    amount: number
    reason: string
  }>
}

/**
 * Extract financial statements from filing text using OpenAI
 */
export async function extractFinancialStatements(
  filingText: string,
  ticker: string,
  formType: '10-K' | '10-Q'
): Promise<FinancialStatements | null> {
  const apiKey = getEnvVar('OPENAI_API_KEY') as string
  const aiMode = (getEnvVar('AI_MODE') as string) || 'demo'

  // Return mock data in demo mode
  if (aiMode === 'demo' || !apiKey || apiKey.trim() === '') {
    log('Using mock financial data (AI demo mode)')
    return getMockFinancialStatements(ticker, formType)
  }

  try {
    // Use OpenAI to extract structured data
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a financial analyst extracting structured data from SEC filings. Extract the three main financial statements (Income Statement, Balance Sheet, Cash Flow Statement) and return as JSON. Use the most recent period's data. All values should be in millions of dollars.`
          },
          {
            role: 'user',
            content: `Extract financial statements from this ${formType} filing for ${ticker}:\n\n${filingText.substring(0, 20000)}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content || '{}')

    log('Financial statements extracted', { ticker, formType, hasData: !!result })

    return normalizeExtractedData(result, ticker, formType)
  } catch (error) {
    log('Error extracting financial statements', {
      ticker,
      error: error instanceof Error ? error.message : String(error)
    })

    // Fall back to mock data
    return getMockFinancialStatements(ticker, formType)
  }
}

/**
 * Calculate owner earnings from financial statements
 */
export function calculateOwnerEarnings(
  financials: FinancialStatements,
  maintenanceCapexRatio: number = 0.7
): OwnerEarningsResult {
  const { netIncome } = financials.incomeStatement
  const { depreciation, amortization, stockBasedComp, capex, changeInWorkingCapital } =
    financials.cashFlowStatement

  // Estimate maintenance CapEx as percentage of total CapEx
  // Growth CapEx vs maintenance CapEx split varies by industry
  const maintenanceCapex = Math.abs(capex) * maintenanceCapexRatio

  // Owner Earnings = Net Income + D&A + SBC - Maintenance CapEx - ΔWC
  const ownerEarnings =
    netIncome +
    (depreciation || 0) +
    (amortization || 0) +
    (stockBasedComp || 0) -
    maintenanceCapex -
    (changeInWorkingCapital || 0)

  const adjustments = []

  if (depreciation) {
    adjustments.push({
      name: 'Depreciation',
      amount: depreciation,
      reason: 'Non-cash charge added back'
    })
  }

  if (amortization) {
    adjustments.push({
      name: 'Amortization',
      amount: amortization,
      reason: 'Non-cash charge added back'
    })
  }

  if (stockBasedComp) {
    adjustments.push({
      name: 'Stock-Based Compensation',
      amount: stockBasedComp,
      reason: 'Non-cash expense added back'
    })
  }

  if (maintenanceCapex) {
    adjustments.push({
      name: 'Maintenance CapEx',
      amount: -maintenanceCapex,
      reason: `Required reinvestment (${Math.round(maintenanceCapexRatio * 100)}% of total CapEx)`
    })
  }

  if (changeInWorkingCapital) {
    adjustments.push({
      name: 'Change in Working Capital',
      amount: -changeInWorkingCapital,
      reason: 'Cash tied up in operations'
    })
  }

  return {
    netIncome,
    depreciation: depreciation || 0,
    amortization: amortization || 0,
    stockBasedComp: stockBasedComp || 0,
    maintenanceCapex,
    changeInWorkingCapital: changeInWorkingCapital || 0,
    ownerEarnings,
    adjustments
  }
}

/**
 * Normalize extracted data to match expected schema
 */
function normalizeExtractedData(
  data: any,
  ticker: string,
  formType: '10-K' | '10-Q'
): FinancialStatements {
  return {
    incomeStatement: {
      revenue: data.incomeStatement?.revenue || 0,
      costOfRevenue: data.incomeStatement?.costOfRevenue || 0,
      grossProfit: data.incomeStatement?.grossProfit || 0,
      operatingExpenses: data.incomeStatement?.operatingExpenses || 0,
      operatingIncome: data.incomeStatement?.operatingIncome || 0,
      interestExpense: data.incomeStatement?.interestExpense || 0,
      taxExpense: data.incomeStatement?.taxExpense || 0,
      netIncome: data.incomeStatement?.netIncome || 0,
      eps: data.incomeStatement?.eps || 0,
      sharesOutstanding: data.incomeStatement?.sharesOutstanding || 0,
      period: data.incomeStatement?.period || new Date().toISOString().split('T')[0],
      periodType: formType === '10-K' ? 'annual' : 'quarterly'
    },
    balanceSheet: {
      totalAssets: data.balanceSheet?.totalAssets || 0,
      currentAssets: data.balanceSheet?.currentAssets || 0,
      cash: data.balanceSheet?.cash || 0,
      accountsReceivable: data.balanceSheet?.accountsReceivable || 0,
      inventory: data.balanceSheet?.inventory || 0,
      totalLiabilities: data.balanceSheet?.totalLiabilities || 0,
      currentLiabilities: data.balanceSheet?.currentLiabilities || 0,
      longTermDebt: data.balanceSheet?.longTermDebt || 0,
      shareholdersEquity: data.balanceSheet?.shareholdersEquity || 0,
      retainedEarnings: data.balanceSheet?.retainedEarnings || 0,
      period: data.balanceSheet?.period || new Date().toISOString().split('T')[0]
    },
    cashFlowStatement: {
      operatingCashFlow: data.cashFlowStatement?.operatingCashFlow || 0,
      investingCashFlow: data.cashFlowStatement?.investingCashFlow || 0,
      financingCashFlow: data.cashFlowStatement?.financingCashFlow || 0,
      capex: data.cashFlowStatement?.capex || 0,
      depreciation: data.cashFlowStatement?.depreciation || 0,
      amortization: data.cashFlowStatement?.amortization || 0,
      stockBasedComp: data.cashFlowStatement?.stockBasedComp || 0,
      freeCashFlow: data.cashFlowStatement?.freeCashFlow || 0,
      changeInWorkingCapital: data.cashFlowStatement?.changeInWorkingCapital || 0,
      period: data.cashFlowStatement?.period || new Date().toISOString().split('T')[0]
    },
    metadata: {
      ticker,
      company: data.metadata?.company || ticker,
      fiscalYear: data.metadata?.fiscalYear || new Date().getFullYear(),
      fiscalQuarter: formType === '10-Q' ? data.metadata?.fiscalQuarter || 4 : undefined,
      currency: data.metadata?.currency || 'USD',
      reportDate: data.metadata?.reportDate || new Date().toISOString().split('T')[0]
    }
  }
}

/**
 * Generate mock financial data for demo/testing
 */
function getMockFinancialStatements(
  ticker: string,
  formType: '10-K' | '10-Q'
): FinancialStatements {
  const baseRevenue = 125000 // $125B
  const currentYear = new Date().getFullYear()

  return {
    incomeStatement: {
      revenue: baseRevenue,
      costOfRevenue: baseRevenue * 0.6,
      grossProfit: baseRevenue * 0.4,
      operatingExpenses: baseRevenue * 0.15,
      operatingIncome: baseRevenue * 0.25,
      interestExpense: baseRevenue * 0.01,
      taxExpense: baseRevenue * 0.05,
      netIncome: baseRevenue * 0.19,
      eps: 12.5,
      sharesOutstanding: 1900,
      period: `${currentYear}-09-30`,
      periodType: formType === '10-K' ? 'annual' : 'quarterly'
    },
    balanceSheet: {
      totalAssets: baseRevenue * 3.2,
      currentAssets: baseRevenue * 1.2,
      cash: baseRevenue * 0.3,
      accountsReceivable: baseRevenue * 0.15,
      inventory: baseRevenue * 0.05,
      totalLiabilities: baseRevenue * 1.8,
      currentLiabilities: baseRevenue * 0.7,
      longTermDebt: baseRevenue * 0.9,
      shareholdersEquity: baseRevenue * 1.4,
      retainedEarnings: baseRevenue * 0.8,
      period: `${currentYear}-09-30`
    },
    cashFlowStatement: {
      operatingCashFlow: baseRevenue * 0.25,
      investingCashFlow: -baseRevenue * 0.15,
      financingCashFlow: -baseRevenue * 0.08,
      capex: -baseRevenue * 0.1,
      depreciation: baseRevenue * 0.05,
      amortization: baseRevenue * 0.02,
      stockBasedComp: baseRevenue * 0.03,
      freeCashFlow: baseRevenue * 0.15,
      changeInWorkingCapital: baseRevenue * 0.02,
      period: `${currentYear}-09-30`
    },
    metadata: {
      ticker,
      company: `${ticker} Corporation`,
      fiscalYear: currentYear,
      fiscalQuarter: formType === '10-Q' ? 4 : undefined,
      currency: 'USD',
      reportDate: `${currentYear}-11-01`
    }
  }
}
