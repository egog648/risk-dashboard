"""CSV ingestion tests."""

from app.services.derisk.ingestion import parse_csv_lots


def test_parse_csv_with_symbol_and_shares_aliases():
    csv_text = """Symbol,Shares,Cost Basis,Trade Date,Description
AAPL,100,15000,2020-01-15,Apple Inc
MSFT,50,12000,2019-06-01,Microsoft Corp
"""
    result = parse_csv_lots(csv_text.encode("utf-8"))
    assert len(result["positions"]) == 2
    assert result["positions"][0]["ticker"] == "AAPL"
    assert result["positions"][0]["lots"][0]["quantity"] == 100


def test_parse_csv_with_preamble_rows():
    csv_text = """Account Holdings Report
Generated 2026-05-31

Symbol,Shares,Cost Basis,Trade Date,Description
AAPL,100,15000,2020-01-15,Apple Inc
"""
    result = parse_csv_lots(csv_text.encode("utf-8"))
    assert len(result["positions"]) == 1
    assert result["positions"][0]["ticker"] == "AAPL"


def test_parse_csv_missing_required_columns_raises():
    import pytest

    csv_text = "Name,Value\nFoo,100\n"
    with pytest.raises(ValueError, match="ticker/symbol"):
        parse_csv_lots(csv_text.encode("utf-8"))


def test_parse_csv_fidelity_with_positions_total_footer():
    csv_text = """Account Number,Account Name,Symbol,Description,Quantity,Last Price,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis Total,Average Cost Basis,Type
123456789,Individual Brokerage,AAPL,APPLE INC,100,195.25,19525.00,50.00,0.26%,2500.00,14.67%,30.00%,17025.00,170.25,Cash
123456789,Individual Brokerage,MSFT,MICROSOFT CORP,50,420.50,21025.00,-30.77,-0.15%,118.00,0.56%,32.00%,20907.00,418.14,Cash
,,Positions Total,,--,--,--,$6439.77,-$30.77,-0.48%,$118.00,1.88%,--,--,--,--
"""
    result = parse_csv_lots(csv_text.encode("utf-8"))
    assert len(result["positions"]) == 2
    tickers = {p["ticker"] for p in result["positions"]}
    assert tickers == {"AAPL", "MSFT"}


def test_parse_csv_headerless_symbol_quantity_rows():
    csv_text = """AAPL,Apple Inc,100,195.25,19525.00,17025.00
MSFT,Microsoft Corp,50,420.50,21025.00,20907.00
Positions Total,,--,--,--,$6439.77
"""
    result = parse_csv_lots(csv_text.encode("utf-8"))
    assert len(result["positions"]) == 2


def test_parse_csv_product_and_qty_aliases():
    csv_text = """Product,Description,Qty,Price,Market Value
AAPL,Apple Inc,100,195,19500
"""
    result = parse_csv_lots(csv_text.encode("utf-8"))
    assert result["positions"][0]["ticker"] == "AAPL"
    assert result["positions"][0]["lots"][0]["quantity"] == 100


def test_parse_csv_utf16_excel_export():
    csv_text = "Symbol,Description,Quantity,Last Price,Current Value\r\nAAPL,Apple,100,195,19500\r\n"
    result = parse_csv_lots(csv_text.encode("utf-16"))
    assert len(result["positions"]) == 1


def test_parse_csv_summary_only_raises_clear_error():
    import pytest

    csv_text = """Market Value,Today's G/L,Total G/L,% of Acct,Est Ann Income,Current Yield
Positions Total,,--,--,--,--,$6439.77,-$30.77,-0.48%,$118.00,1.88%,--,--,--,--,--,--
"""
    with pytest.raises(ValueError, match="portfolio summary"):
        parse_csv_lots(csv_text.encode("utf-8"))


def test_parse_fidelity_positions_export():
    from pathlib import Path

    fixture = Path(__file__).parent / "fixtures" / "fidelity_positions_sample.csv"
    result = parse_csv_lots(fixture.read_bytes())
    tickers = {p["ticker"] for p in result["positions"]}
    assert tickers == {"RSP", "SGOV"}
    rsp = next(p for p in result["positions"] if p["ticker"] == "RSP")
    assert rsp["lots"][0]["quantity"] == 3.0243
    assert rsp["lots"][0]["total_cost"] > 0
    assert rsp["lots"][0]["market_value"] > 0
