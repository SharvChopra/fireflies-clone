import argparse

from .database import SessionLocal, init_db
from .seed import seed_demo_data


def initialize_database(*, refresh_demo: bool = False) -> int:
    init_db()
    db = SessionLocal()
    try:
        inserted = seed_demo_data(db, refresh_demo=refresh_demo)
    finally:
        db.close()
    operation = "refreshed" if refresh_demo else "initialized"
    print(f"Database {operation}; {inserted} demo meetings added.")
    return inserted


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Initialize the SQLite database and seed demo meetings."
    )
    parser.add_argument(
        "--refresh-demo",
        action="store_true",
        help=(
            "replace the known current/legacy demo meetings with the canonical "
            "five-meeting dataset; preserve all other meetings"
        ),
    )
    arguments = parser.parse_args()
    initialize_database(refresh_demo=arguments.refresh_demo)
