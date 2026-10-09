import sqlite3
from pathlib import Path


def verify_database() -> None:
    db_path = Path(__file__).resolve().parents[2] / "data" / "fireflies.db"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    tables = cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    print("TABLES")
    for row in tables:
        print(row[0])

    print("COUNTS")
    for table in ["meetings", "participants", "transcript_segments", "summaries", "action_items", "meeting_topics"]:
        count = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"{table}: {count}")

    conn.close()


if __name__ == "__main__":
    verify_database()
