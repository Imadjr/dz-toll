"""
Test script for creating notification test data
Run this to populate your notification system with test data
"""

import requests
import sys

BASE_URL = "http://localhost:5000"


def create_user_notifications(plate="ABC123"):
    """Create test notifications for a specific user"""
    print("\n" + "=" * 60)
    print("🧪 CREATING USER NOTIFICATIONS FOR: {}".format(plate))
    print("=" * 60 + "\n")

    try:
        msg = "📧 Creating notifications for user {}...".format(plate)
        print(msg)
        response = requests.post(
            "{}/api/test/create-notifications".format(BASE_URL),
            json={"type": "user", "plate": plate},
        )

        if response.ok:
            data = response.json()
            print("✅ {}".format(data["message"]))
            created_msg = ", ".join(data["created"])
            print("   Created: {}".format(created_msg))
            print("\n" + "=" * 60)
            print("✨ USER NOTIFICATIONS CREATED!")
            print("=" * 60)
            print("\n📋 Next steps:")
            step1 = "   1. Login as the configured user for plate: {}"
            print(step1.format(plate))
            print("   2. Check the bell icon for notification count")
            print("   3. Click the bell to view notifications")
            print("   4. Test delete functionality\n")
            return True
        else:
            err = "❌ Failed: {} - {}"
            print(err.format(response.status_code, response.text))
            return False

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to Flask server!")
        print("   Make sure flask_server.py is running on port 5000")
        return False
    except Exception as e:
        print("❌ ERROR: {}".format(str(e)))
        return False


def create_test_notifications():
    """Create test notifications for both admin and users"""
    print("\n" + "=" * 60)
    print("🧪 CREATING TEST NOTIFICATIONS")
    print("=" * 60 + "\n")

    try:
        # Create admin notifications
        print("📧 Creating admin notifications...")
        url = "{}/api/test/create-notifications".format(BASE_URL)
        response = requests.post(url, json={"type": "admin"})

        if response.ok:
            data = response.json()
            print("✅ {}".format(data["message"]))
            created_msg = ", ".join(data["created"])
            print("   Created: {}".format(created_msg))
        else:
            err = "❌ Failed: {} - {}"
            print(err.format(response.status_code, response.text))

        print()

        # Create user notifications for ABC123
        print("📧 Creating user notifications (ABC123)...")
        response = requests.post(url, json={"type": "user", "plate": "ABC123"})

        if response.ok:
            data = response.json()
            print("✅ {}".format(data["message"]))
            created_msg = ", ".join(data["created"])
            print("   Created: {}".format(created_msg))
        else:
            err = "❌ Failed: {} - {}"
            print(err.format(response.status_code, response.text))

        print("\n" + "=" * 60)
        print("✨ TEST DATA CREATED SUCCESSFULLY!")
        print("=" * 60)
        print("\n📋 Next steps:")
        print("   1. Login with the configured admin credentials")
        print("   2. Check the bell icon for notification count")
        print("   3. Click the bell to view notifications")
        print("   4. Login with the configured user credentials for ABC123")
        print("   5. Check user notifications\n")

        return True

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to Flask server!")
        print("   Make sure flask_server.py is running on port 5000")
        return False
    except Exception as e:
        print("❌ ERROR: {}".format(str(e)))
        return False


def clear_notifications(target="all"):
    """Clear notifications"""
    print("\n" + "=" * 60)
    header = "🗑️  CLEARING {} NOTIFICATIONS".format(target.upper())
    print(header)
    print("=" * 60 + "\n")

    try:
        url = "{}/api/test/clear-notifications".format(BASE_URL)
        response = requests.post(url, json={"target": target})

        if response.ok:
            data = response.json()
            print("✅ {}".format(data["message"]))
        else:
            err = "❌ Failed: {} - {}"
            print(err.format(response.status_code, response.text))

        return response.ok

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to Flask server!")
        return False
    except Exception as e:
        print("❌ ERROR: {}".format(str(e)))
        return False


def main():
    """Main function"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "clear":
            clear_notifications()
        elif sys.argv[1] == "user":
            # python test_notifications.py user ABC123
            plate = sys.argv[2] if len(sys.argv) > 2 else "ABC123"
            create_user_notifications(plate)
        else:
            print("\n❌ Unknown command!")
            print("\nUsage:")
            msg1 = "  python test_notifications.py"
            msg2 = "  # Create both admin & user notifications"
            print("{}           {}".format(msg1, msg2))
            msg3 = "  python test_notifications.py user XYZ"
            msg4 = "  # Create notifications for specific user"
            print("{}  {}".format(msg3, msg4))
            msg5 = "  python test_notifications.py clear"
            msg6 = "  # Clear all notifications"
            print("{}     {}".format(msg5, msg6))
    else:
        create_test_notifications()


if __name__ == "__main__":
    main()
