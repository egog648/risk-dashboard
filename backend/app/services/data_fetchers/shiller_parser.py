"""Parse helpers for Shiller CAPE dataset."""
from __future__ import annotations

import xlrd
import pandas as pd


def parse_shiller_cape_series(content: bytes) -> pd.Series:
    """Parse CAPE values from Shiller ie_data.xls bytes."""
    book = xlrd.open_workbook(file_contents=content)
    sheet = book.sheet_by_name("Data")

    header_row = None
    cape_col = None
    for row_idx in range(min(sheet.nrows, 20)):
        headers = [str(sheet.cell_value(row_idx, col)).strip() for col in range(sheet.ncols)]
        if "CAPE" in headers:
            header_row = row_idx
            cape_col = headers.index("CAPE")
            break

    if header_row is None or cape_col is None:
        raise ValueError("CAPE column not found in Shiller dataset")

    date_col = 0
    dates: list[pd.Timestamp] = []
    values: list[float] = []
    for row_idx in range(header_row + 1, sheet.nrows):
        raw_date = sheet.cell_value(row_idx, date_col)
        raw_cape = sheet.cell_value(row_idx, cape_col)
        if raw_cape in ("", None):
            continue
        try:
            cape_value = float(raw_cape)
        except (TypeError, ValueError):
            continue
        if cape_value <= 0:
            continue

        if isinstance(raw_date, float):
            date_value = xlrd.xldate_as_datetime(raw_date, book.datemode)
        else:
            date_value = pd.to_datetime(raw_date, errors="coerce")
            if pd.isna(date_value):
                continue

        dates.append(pd.Timestamp(date_value))
        values.append(cape_value)

    if not values:
        raise ValueError("No valid CAPE observations in Shiller dataset")

    series = pd.Series(values, index=pd.DatetimeIndex(dates), dtype=float)
    return series.sort_index()
