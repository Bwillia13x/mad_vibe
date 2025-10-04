CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sector TEXT,
  geo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_metrics (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  roic NUMERIC,
  fcf_yield NUMERIC,
  leverage NUMERIC,
  growth_durability NUMERIC,
  insider_ownership NUMERIC,
  quality_score NUMERIC,
  moat TEXT,
  accruals NUMERIC,
  selected BOOLEAN DEFAULT FALSE,
  match_reason TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO companies (ticker, name, sector, geo)
VALUES
  ('APCX', 'Atlas Precision Components', 'Industrials', 'North America'),
  ('MRSY', 'Meridian Relay Systems', 'Information Technology', 'Global'),
  ('CLAR', 'Clarion Capital Partners', 'Financials', 'North America')
ON CONFLICT (ticker) DO NOTHING;

INSERT INTO financial_metrics (company_id, roic, fcf_yield, leverage, growth_durability, insider_ownership, quality_score, moat, accruals, selected, match_reason)
SELECT id, roic, fcf_yield, leverage, growth_durability, insider_ownership, quality_score, moat, accruals, selected, match_reason
FROM (
  VALUES
    ('APCX', 18.7, 6.8, 1.1, 0.74, 0.12, 86, 'High switching costs in aerospace sensors', 0.8, FALSE, 'Mission-critical supplier with durable economics'),
    ('MRSY', 21.3, 7.5, 0.9, 0.69, 0.09, 84, 'Automation workflow platform', 0.5, FALSE, 'Sticky automation footprint; pricing tailwinds'),
    ('CLAR', 16.5, 6.2, 1.3, 0.65, 0.07, 79, 'PE-style capital allocator', 1.1, FALSE, 'Disciplined capital rotation; needs governance review')
) AS seed(ticker, roic, fcf_yield, leverage, growth_durability, insider_ownership, quality_score, moat, accruals, selected, match_reason)
JOIN companies c ON c.ticker = seed.ticker
ON CONFLICT (company_id) DO UPDATE SET
  roic = EXCLUDED.roic,
  fcf_yield = EXCLUDED.fcf_yield,
  leverage = EXCLUDED.leverage,
  growth_durability = EXCLUDED.growth_durability,
  insider_ownership = EXCLUDED.insider_ownership,
  quality_score = EXCLUDED.quality_score,
  moat = EXCLUDED.moat,
  accruals = EXCLUDED.accruals,
  selected = EXCLUDED.selected,
  match_reason = EXCLUDED.match_reason,
  updated_at = NOW();
