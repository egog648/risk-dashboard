# FRED Series Reference

All FRED series IDs used in this project. Browse at https://fred.stlouisfed.org/

## Equities
| Series ID | Description | Frequency |
|---|---|---|
| `SP500` | S&P 500 Index | Daily |
| `VIXCLS` | CBOE Volatility Index (VIX) | Daily |
| `MKTGDPNAMER` | US Market Cap / GDP (Buffett Indicator) | Annual |

## Credit
| Series ID | Description | Frequency |
|---|---|---|
| `DGS2` | 2-Year Treasury Constant Maturity Rate | Daily |
| `DGS10` | 10-Year Treasury Constant Maturity Rate | Daily |
| `DGS30` | 30-Year Treasury Constant Maturity Rate | Daily |
| `T10Y2Y` | 10-Year minus 2-Year Treasury Spread | Daily |
| `FEDFUNDS` | Federal Funds Effective Rate | Monthly |
| `BAMLH0A0HYM2` | ICE BofA US High Yield OAS | Daily |
| `BAMLC0A0CM` | ICE BofA US Corporate Bond OAS | Daily |

## Hard Assets
| Series ID | Description | Frequency |
|---|---|---|
| `GOLDAMGBD228NLBM` | Gold Fixing Price (London, USD/troy oz) | Daily |
| `CPIAUCSL` | Consumer Price Index — All Urban Consumers | Monthly |
| `T10YIE` | 10-Year Breakeven Inflation Rate | Daily |

## Cash
| Series ID | Description | Frequency |
|---|---|---|
| `DTB3` | 3-Month Treasury Bill Secondary Market Rate | Daily |

## Reserved (not currently refreshed)
| Series ID | Description | Notes |
|---|---|---|
| `SHILLER_CAPE` | Yale Shiller CAPE (via `ie_data.xls`) | Refreshed daily; source `shiller`; used for large-cap earnings yield |
| `DCOILWTICO` | WTI Crude Oil Price | Available for future commodities work |
| `CSUSHPISA` | Case-Shiller Home Price Index | Available for future REIT/housing work |
| `SOFR` | Secured Overnight Financing Rate | Available for future cash work |
| `MKTGDPNAMER` | Buffett Indicator | Documented for methodology reference |

## Market Proxy Tickers (Tiingo-backed fetcher)
| Ticker | Asset Class | Description |
|---|---|---|
| `SPY` | Equities — Large Cap | S&P 500 ETF |
| `MDY` | Equities — Mid Cap | S&P 400 ETF |
| `IWM` | Equities — Small Cap | Russell 2000 ETF |
| `TLT` | Credit — Government | 20+ Year Treasury ETF |
| `LQD` | Credit — IG Corporate | Investment Grade Corp Bond ETF |
| `HYG` | Credit — HY Corporate | High Yield Corp Bond ETF |
| `GLD` | Hard Assets — Gold | Gold ETF |
| `VNQ` | Hard Assets — REITs | US REIT ETF |
| `DBC` | Hard Assets — Commodities | Invesco DB Commodity Index Tracking Fund |
| `SHY` | Cash | 1-3 Year Treasury ETF (cash proxy) |

## Reserved tickers (not currently refreshed)
| Ticker | Description |
|---|---|
| `IEF` | 7-10 Year Treasury ETF — available for future use |
