-- Create prices table to store cryptocurrency prices in fiat currencies
CREATE TABLE prices (
  currency_symbol VARCHAR(10) NOT NULL, -- Crypto currency symbol like "BTC", "ETH"
  fiat_currency VARCHAR(3) NOT NULL, -- Fiat currency code like "USD", "CHF"
  price DECIMAL(20, 8) NOT NULL, -- Price value with high precision for crypto
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (currency_symbol, fiat_currency)
);

ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to everyone" ON prices FOR SELECT TO anon USING (true);

-- Create index for efficient queries by timestamp
CREATE INDEX idx_prices_created_at ON prices(created_at);

-- Add constraint to ensure fiat_currency is uppercase
ALTER TABLE prices ADD CONSTRAINT fiat_currency_uppercase CHECK (fiat_currency = UPPER(fiat_currency));

-- Add constraint to ensure currency_symbol is uppercase  
ALTER TABLE prices ADD CONSTRAINT currency_symbol_uppercase CHECK (currency_symbol = UPPER(currency_symbol));

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
