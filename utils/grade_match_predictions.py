"""
Usage:
  python3 utils/grade_match_predictions.py
  python3 utils/grade_match_predictions.py --match-id 1 --output utils/leaderboard.csv --swap True
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

import mysql.connector
import pandas as pd
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

db_config = {
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PWD"),
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME"),
    "port": int(os.getenv("DB_PORT", "3306")),
}


# def normalize_team(name: str | None) -> str:
#     if name is None or (isinstance(name, float) and pd.isna(name)):
#         return ""
#     return str(name).strip().lower()


def score_swap(first_a: int, second_a: int, first_b: int, second_b: int, swap: bool) -> tuple[int, int, int, int]:
    if not swap:
        return first_a, first_b, second_a, second_b
    return first_b, first_a, second_b, second_a

def count_correct_score(pred: tuple[int, int, int, int], actual: tuple[int, int, int, int]) -> int:
    return sum(p == a for p, a in zip(pred, actual))


def score_diff_abs(pred: tuple[int, int, int, int], actual: tuple[int, int, int, int]) -> int:
    return sum(abs(p - a) for p, a in zip(pred, actual))


def is_final_result_correct(pred: tuple[int, int, int, int], actual: tuple[int, int, int, int]) -> int:
    
    def match_outcome(score_i: int, score_j: int) -> int:
        if score_i > score_j:
            return 1
        if score_i < score_j:
            return -1
        return 0

    pred_total_a = pred[0] + pred[2]
    pred_total_b = pred[1] + pred[3]
    actual_total_a = actual[0] + actual[2]
    actual_total_b = actual[1] + actual[3]
    return int(match_outcome(pred_total_a, pred_total_b) == match_outcome(actual_total_a, actual_total_b))


def fetch_match_info(connection: mysql.connector.MySQLConnection, match_id: int | None) -> pd.Series:
    query = """
        SELECT id, match_name, team_a, team_b,
               first_score_a, first_score_b, second_score_a, second_score_b
        FROM match_info
    """
    params: tuple = ()
    if match_id is not None:
        query += " WHERE id = %s"
        params = (match_id,)
    else:
        query += " ORDER BY match_time DESC LIMIT 1"

    df = pd.read_sql(query, connection, params=params)
    if df.empty:
        raise ValueError("No match_info row found.")
    return df.iloc[0]


def fetch_predictions(connection: mysql.connector.MySQLConnection, match_id: int) -> pd.DataFrame:
    query = """
        SELECT id, user_id, match_id,
               first_score_a, first_score_b, second_score_a, second_score_b,
               time_submit, prediction_result
        FROM match_prediction
        WHERE match_id = %s
    """
    return pd.read_sql(query, connection, params=(match_id,))


def fetch_user(connection: mysql.connector.MySQLConnection, user_id: int) -> pd.DataFrame:
    query = """
        SELECT * FROM user WHERE id = %s
    """
    return pd.read_sql(query, connection, params=(user_id,))


def filter_and_dedupe_predictions(df: pd.DataFrame, deadline: datetime) -> pd.DataFrame:
    if df.empty:
        return df

    out = df.copy()
    out["time_submit"] = pd.to_datetime(out["time_submit"])

    out = out[out["time_submit"] < deadline] # filter

    if out.empty:
        return out

    out = out.sort_values("time_submit")
    out = out.groupby("user_id", as_index=False).last() # dedupe
    return out.reset_index(drop=True)


def grade_predictions(connection, predictions: pd.DataFrame, match_row: pd.Series, swap: bool) -> pd.DataFrame:
    actual = (
        int(match_row["first_score_a"]),
        int(match_row["first_score_b"]),
        int(match_row["second_score_a"]),
        int(match_row["second_score_b"]),
    )

    rows = []
    for _, row in predictions.iterrows():
        pred = (
            int(row["first_score_a"]),
            int(row["first_score_b"]),
            int(row["second_score_a"]),
            int(row["second_score_b"]),
        )
        pred = score_swap(*pred, swap=swap)

        rows.append(
            {
                "id": int(row["id"]),
                "user_id": int(row["user_id"]),
                "match_id": int(row["match_id"]),
                "first_score_a": pred[0],
                "first_score_b": pred[1],
                "second_score_a": pred[2],
                "second_score_b": pred[3],
                "time_submit": row["time_submit"],
                "is_swapped": swap,
                "count_correct_score": count_correct_score(pred, actual),
                "score_diff_abs": score_diff_abs(pred, actual),
                "is_final_result_correct": is_final_result_correct(pred, actual),
            }
        )

    graded = pd.DataFrame(rows)
    if graded.empty:
        return graded

    graded = graded.sort_values(
        by=["count_correct_score", "score_diff_abs", "is_final_result_correct"],
        ascending=[False, True, False],
    ).reset_index(drop=True)
    graded["rank"] = graded.index + 1

    graded[""] = ""
    graded["user_student_number"] = graded["user_id"].apply(lambda x: fetch_user(connection, x)["student_number"])
    graded["user_name_kr"] = graded["user_id"].apply(lambda x: fetch_user(connection, x)["name_kr"])
    graded["user_name_en"] = graded["user_id"].apply(lambda x: fetch_user(connection, x)["name_en"])
    graded["user_email"] = graded["user_id"].apply(lambda x: fetch_user(connection, x)["email"])
    return graded


def assert_actual_scores_complete(match_row: pd.Series) -> None:
    cols = ["first_score_a", "first_score_b", "second_score_a", "second_score_b"]
    missing = [c for c in cols if pd.isna(match_row[c])]
    if missing:
        raise ValueError(
            f"match_info id={match_row['id']} has null actual scores: {missing}. "
        )


def print_top_n(leaderboard: pd.DataFrame, n: int = 10) -> None:
    display_cols = [
        "rank",
        "id",
        "user_id",
        "match_id",
        "time_submit",
        "is_swapped",
        "count_correct_score",
        "score_diff_abs",
        "is_final_result_correct",
    ]
    top = leaderboard.head(n)
    print(f"\n=== Top {min(n, len(top))} (of {len(leaderboard)} graded) ===\n")
    if top.empty:
        print("(no rows)")
        return
    print(top[display_cols].to_string(index=False))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Grade match predictions and export leaderboard CSV.")
    parser.add_argument(
        "--match-id",
        type=int,
        default=None,
        help="match_info.id to grade (default: latest by match_time)",
    )
    parser.add_argument(
        "--deadline",
        type=str,
        default="2026-05-31 01:00:00",
        help="Submissions after this time are excluded",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(Path(__file__).resolve().parent / "leaderboard.csv"),
        help="Output CSV path",
    )
    parser.add_argument(
        "--swap",
        type=bool,
        default=False,
        help="Swap the scores if team_a and team_b are swapped between match_info and match_prediction",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    deadline = datetime.strptime(args.deadline, "%Y-%m-%d %H:%M:%S")
    output_path = Path(args.output)
    swap = args.swap

    print(f"DB: {db_config['host']} / {db_config['database']}")
    print(f"Deadline: {deadline}")
    print(f"Output: {output_path}")

    connection = mysql.connector.connect(**db_config)
    try:
        match_row = fetch_match_info(connection, args.match_id)
        match_id = int(match_row["id"])
        assert_actual_scores_complete(match_row)

        raw = fetch_predictions(connection, match_id)
        print(f"\nRaw predictions: {len(raw)} rows")

        filtered = filter_and_dedupe_predictions(raw, deadline)
        print(f"Filter(after deadline) + Dedupe(latest-per-user): {len(filtered)} rows")

        if filtered.empty:
            print("No eligible predictions to grade.")
            sys.exit(0)
        
        leaderboard = grade_predictions(connection, filtered, match_row, swap=swap)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        leaderboard.to_csv(output_path, index=False, encoding="utf-8-sig")
        print(f"\nWrote {len(leaderboard)} rows to {output_path}")

        print_top_n(leaderboard, n=10)
    finally:
        connection.close()


if __name__ == "__main__":
    main()
