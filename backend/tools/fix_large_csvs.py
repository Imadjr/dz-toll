"""
CSV Cleanup Script for DzToll
Reduces large CSV files to improve performance
"""

import pandas as pd
import os
import shutil
from datetime import datetime

# Configuration
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_CSV = os.path.join(BACKEND_DIR, "toll_log.csv")
USERS_CSV = os.path.join(BACKEND_DIR, "users.csv")
BACKUP_DIR = os.path.join(BACKEND_DIR, "backups")

# Create backups directory
os.makedirs(BACKUP_DIR, exist_ok=True)


def backup_file(file_path, backup_name):
    """Create backup of a file"""
    if os.path.exists(file_path):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(BACKUP_DIR, f"{backup_name}_{timestamp}.csv")
        shutil.copy2(file_path, backup_path)
        print(f"✅ Backup created: {backup_path}")
        return backup_path
    return None


def clean_toll_log(keep_last=100):
    """
    Clean toll_log.csv by keeping only recent records

    Args:
        keep_last (int): Number of recent records to keep
    """
    print("\n" + "=" * 60)
    print("📝 Cleaning toll_log.csv")
    print("=" * 60)

    if not os.path.exists(LOG_CSV):
        print("❌ toll_log.csv not found")
        return

    try:
        # Read current file
        df = pd.read_csv(LOG_CSV)
        original_count = len(df)
        print(f"📊 Original records: {original_count:,}")

        if original_count <= keep_last:
            print(f"✅ File already optimal ({original_count} records)")
            return

        # Create backup
        backup_file(LOG_CSV, "toll_log_FULL")

        # Sort by timestamp and keep last N records
        if "Timestamp" in df.columns:
            df = df.sort_values("Timestamp", ascending=False)

        df_small = df.head(keep_last)

        # Save cleaned version
        df_small.to_csv(LOG_CSV, index=False)

        print(f"✅ Reduced to {len(df_small)} records")
        print(f"🗑️ Removed {original_count - len(df_small):,} old records")

    except Exception as e:
        print(f"❌ Error cleaning toll_log.csv: {e}")


def clean_users(remove_inactive=False):
    """
    Clean users.csv by removing duplicates and optionally inactive users

    Args:
        remove_inactive (bool): Whether to remove inactive users
    """
    print("\n" + "=" * 60)
    print("👥 Cleaning users.csv")
    print("=" * 60)

    if not os.path.exists(USERS_CSV):
        print("❌ users.csv not found")
        return

    try:
        # Read current file
        df = pd.read_csv(USERS_CSV, dtype=str)
        original_count = len(df)
        print(f"📊 Original records: {original_count:,}")

        # Create backup
        backup_file(USERS_CSV, "users_FULL")

        # Remove duplicates based on plate
        if "plate" in df.columns:
            df = df.drop_duplicates(subset=["plate"], keep="last")
            after_dedup = len(df)
            if after_dedup < original_count:
                print(f"🗑️ Removed {original_count - after_dedup} duplicates")

        # Optionally remove inactive users
        if remove_inactive and "active" in df.columns:
            df = df[df["active"].str.lower().isin(["true", "1", "yes"])]
            after_inactive = len(df)
            if after_inactive < after_dedup:
                print(f"🗑️ Removed {after_dedup - after_inactive} inactive users")

        # Save cleaned version
        df.to_csv(USERS_CSV, index=False)

        print(f"✅ Final user count: {len(df)}")

    except Exception as e:
        print(f"❌ Error cleaning users.csv: {e}")


def show_statistics():
    """Show current file statistics"""
    print("\n" + "=" * 60)
    print("📊 CURRENT FILE STATISTICS")
    print("=" * 60)

    # Toll Log Stats
    if os.path.exists(LOG_CSV):
        df = pd.read_csv(LOG_CSV)
        size_mb = os.path.getsize(LOG_CSV) / (1024 * 1024)
        print(f"\n📝 toll_log.csv:")
        print(f"   Records: {len(df):,}")
        print(f"   Size: {size_mb:.2f} MB")

        if "Timestamp" in df.columns:
            df["Timestamp"] = pd.to_datetime(df["Timestamp"])
            oldest = df["Timestamp"].min()
            newest = df["Timestamp"].max()
            print(f"   Date range: {oldest} to {newest}")
    else:
        print("\n📝 toll_log.csv: Not found")

    # Users Stats
    if os.path.exists(USERS_CSV):
        df = pd.read_csv(USERS_CSV, dtype=str)
        size_mb = os.path.getsize(USERS_CSV) / (1024 * 1024)
        print(f"\n👥 users.csv:")
        print(f"   Records: {len(df):,}")
        print(f"   Size: {size_mb:.2f} MB")

        if "active" in df.columns:
            active_count = df[
                df["active"].str.lower().isin(["true", "1", "yes"])
            ].shape[0]
            print(f"   Active users: {active_count}")
    else:
        print("\n👥 users.csv: Not found")

    # Backups
    if os.path.exists(BACKUP_DIR):
        backups = os.listdir(BACKUP_DIR)
        print(f"\n💾 Backups: {len(backups)} files in {BACKUP_DIR}")

    print("=" * 60)


def main():
    """Main cleanup function"""
    print("\n" + "=" * 60)
    print("🧹 DzToll - CSV Cleanup Tool")
    print("=" * 60)

    # Show current stats
    show_statistics()

    # Ask user for confirmation
    print("\n⚠️  This will:")
    print("   1. Create backups of your current CSV files")
    print("   2. Keep only the last 100 toll events")
    print("   3. Remove duplicate users")
    print()
    response = input("Continue? (yes/no): ").strip().lower()

    if response not in ["yes", "y"]:
        print("\n❌ Operation cancelled")
        return

    # Clean files
    clean_toll_log(keep_last=100)
    clean_users(remove_inactive=False)

    # Show new stats
    print("\n" + "=" * 60)
    print("✅ CLEANUP COMPLETE!")
    print("=" * 60)
    show_statistics()

    print("\n💡 TIP: All original data is backed up in:")
    print(f"   {BACKUP_DIR}")
    print("\n🚀 Restart your Flask server to see the improvements!")


if __name__ == "__main__":
    main()
