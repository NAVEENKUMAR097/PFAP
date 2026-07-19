"""
Script to run seed process with Neon PostgreSQL.
"""
import os
import sys

# Set DATABASE_URL for Neon
os.environ['DATABASE_URL'] = 'postgresql://neondb_owner:npg_TvBryU82NXED@ep-red-darkness-azf52s9z.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
os.environ['ENVIRONMENT'] = 'production'

from app.database import SessionLocal
from app import seed

def main():
    print("Starting seed process with Neon PostgreSQL...")
    db = SessionLocal()
    try:
        seed.run_seed(db)
        print("Seed process completed successfully!")
    except Exception as e:
        print(f"Seed process failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
