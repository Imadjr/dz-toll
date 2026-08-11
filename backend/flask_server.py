# flake8: noqa: E501
"""Smart Toll System - Flask API Server with Real-Time WebSocket Updates"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import pandas as pd
import os
import json
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv
import time
import secrets
import traceback
import threading
import hmac

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
USER_PASSWORD = os.getenv("USER_PASSWORD", "")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

# === Flask App Setup ===
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

# === CORS Configuration ===
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS}})

# === WebSocket (Socket.IO) Setup ===
socketio = SocketIO(
    app,
    cors_allowed_origins=CORS_ORIGINS,
    async_mode="threading",
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
)

# === Paths & Global State ===
USERS_CSV = os.path.join(BASE_DIR, "users.csv")
TOLL_LOG_CSV = os.path.join(BASE_DIR, "toll_log.csv")
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "snapshots")

active_tokens = {}
recharge_requests = []
notifications_store = (
    {}
)  # Format: {plate: [notifications], 'admin': [admin_notifications]}
notification_counter = {"user": 1, "admin": 1}  # Separate counters for user and admin
connected_clients = {"admin": [], "user": []}


# === File Watcher for Real-Time Updates ===
class CSVFileHandler(FileSystemEventHandler):
    """Monitor CSV files for changes and broadcast updates via WebSocket"""

    def __init__(self, filename, callback):
        self.filename = filename
        self.callback = callback
        self.last_modified = time.time()

    def on_modified(self, event):
        if event.src_path.endswith(self.filename):
            current_time = time.time()
            if current_time - self.last_modified > 0.5:
                self.last_modified = current_time
                threading.Thread(target=self.callback, daemon=True).start()


def broadcast_toll_event():
    """Broadcast new toll event to all connected clients"""
    try:
        if not os.path.exists(TOLL_LOG_CSV):
            return
        df = pd.read_csv(TOLL_LOG_CSV)
        latest = df.tail(1).to_dict("records")
        if latest:
            event_data = latest[0]
            socketio.emit(
                "toll_event",
                {
                    "type": "toll_event",
                    "event": event_data,
                    "timestamp": datetime.now().isoformat(),
                },
            )
            analytics = calculate_analytics()
            socketio.emit(
                "analytics_update", {"type": "analytics_update", "data": analytics}
            )
            print(f"✅ Broadcasted toll event: {event_data.get('Plate', 'N/A')}")
    except Exception as e:
        print(f"❌ Error broadcasting toll event: {e}")


def broadcast_users_update():
    """Broadcast user list update after CSV changes"""
    try:
        if os.path.exists(USERS_CSV):
            df = pd.read_csv(USERS_CSV)
            users = []
            for _, row in df.iterrows():
                users.append(
                    {
                        "plate": str(row.get("plate", "")).strip(),
                        "rfid_uid": str(row.get("rfid_uid", "")).strip(),
                        "owner_name": row.get("owner", "N/A"),
                        "email": str(row.get("Email", "N/A")).strip(),
                        "phone": (
                            str(row.get("phone", "")).strip()
                            if "phone" in row and pd.notna(row.get("phone"))
                            else ""
                        ),
                        "balance_da": float(row.get("balance_da", 0) or 0),
                        "balance": float(row.get("balance_da", 0) or 0),
                        "is_active": bool(row.get("active", True)),
                        "active": bool(row.get("active", True)),
                        "vehicle_img": row.get("vehicle_img", ""),
                        "vehicle_type": row.get("vehicle_img", ""),
                    }
                )
            socketio.emit(
                "users_updated",
                {
                    "type": "users_updated",
                    "users": users,
                    "timestamp": datetime.now().isoformat(),
                },
            )
            analytics = calculate_analytics()
            socketio.emit(
                "analytics_update", {"type": "analytics_update", "data": analytics}
            )
            print("✅ Broadcasted users update")
    except Exception as e:
        print(f"❌ Error broadcasting users update: {e}")


def calculate_analytics():
    """Calculate real-time analytics from toll events and users"""
    try:
        if os.path.exists(TOLL_LOG_CSV):
            events_df = pd.read_csv(TOLL_LOG_CSV)
            total_events = len(events_df)
            granted = len(events_df[events_df["Status"] == "GRANTED"])
            denied = len(events_df[events_df["Status"] == "DENIED"])
            total_revenue = float(
                events_df[events_df["Status"] == "GRANTED"]["Fee_DA"].fillna(0).sum()
            )
        else:
            total_events = granted = denied = total_revenue = 0

        if os.path.exists(USERS_CSV):
            users_df = pd.read_csv(USERS_CSV)
            if "active" in users_df.columns:
                active_users = len(
                    users_df[users_df["active"].astype(str).str.lower() == "true"]
                )
            else:
                active_users = len(users_df)
            total_balance = (
                float(users_df["balance_da"].fillna(0).sum())
                if "balance_da" in users_df.columns
                else 0.0
            )
        else:
            active_users = total_balance = 0

        return {
            "total_events": int(total_events),
            "granted": int(granted),
            "denied": int(denied),
            "total_revenue": float(total_revenue),
            "active_users": int(active_users),
            "total_balance": float(total_balance),
        }
    except Exception as e:
        print(f"❌ Analytics error: {e}")
        return {
            "total_events": 0,
            "granted": 0,
            "denied": 0,
            "total_revenue": 0.0,
            "active_users": 0,
            "total_balance": 0.0,
        }


# === Start File Watchers ===
observer = Observer()
toll_handler = CSVFileHandler("toll_log.csv", broadcast_toll_event)
users_handler = CSVFileHandler("users.csv", broadcast_users_update)
observer.schedule(toll_handler, BASE_DIR, recursive=False)
observer.schedule(users_handler, BASE_DIR, recursive=False)
observer.start()

# ============================================================
# AUTHENTICATION ROUTES
# ============================================================


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    """Admin authentication endpoint"""
    data = request.json or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    if not ADMIN_PASSWORD:
        return jsonify({"message": "Admin login is not configured"}), 503

    if hmac.compare_digest(username, ADMIN_USERNAME) and hmac.compare_digest(
        password, ADMIN_PASSWORD
    ):
        token = secrets.token_urlsafe(32)
        active_tokens[token] = {
            "type": "admin",
            "username": username,
            "created_at": datetime.now().isoformat(),
        }

        # Initialize admin notifications if not exists
        if "admin" not in notifications_store:
            notifications_store["admin"] = []

        return (
            jsonify({"token": token, "admin": {"username": username, "role": "admin"}}),
            200,
        )
    return jsonify({"message": "Invalid admin credentials"}), 401


@app.route("/api/user/login", methods=["POST"])
def user_login():
    """User authentication endpoint"""
    data = request.json or {}
    identifier = str(data.get("identifier", "")).strip()
    password = str(data.get("password", "")).strip()
    try:
        if not os.path.exists(USERS_CSV):
            return jsonify({"message": "Invalid user credentials"}), 401

        df = pd.read_csv(USERS_CSV)
        for col in ["plate", "rfid_uid", "Email"]:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        mask = (
            (df["plate"] == identifier)
            | (df["rfid_uid"].str.lower() == identifier.lower())
            | (df["Email"].str.lower() == identifier.lower())
        )
        user = df[mask]

        if not USER_PASSWORD:
            return jsonify({"message": "User login is not configured"}), 503

        if user.empty or not hmac.compare_digest(password, USER_PASSWORD):
            return jsonify({"message": "Invalid user credentials"}), 401

        row = user.iloc[0].to_dict()
        plate = str(row.get("plate", ""))
        token = secrets.token_urlsafe(32)
        active_tokens[token] = {
            "type": "user",
            "plate": plate,
            "created_at": datetime.now().isoformat(),
        }

        # Initialize user notifications if not exists
        if plate not in notifications_store:
            notifications_store[plate] = []

        return (
            jsonify(
                {
                    "token": token,
                    "user": {
                        "plate": plate,
                        "owner_name": row.get("owner", "N/A"),
                        "email": row.get("Email", "N/A"),
                        "rfid_uid": str(row.get("rfid_uid", "N/A")),
                    },
                }
            ),
            200,
        )
    except Exception as e:
        print(f"❌ User login error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/logout", methods=["POST"])
def logout():
    """Logout endpoint"""
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "")
    if token in active_tokens:
        del active_tokens[token]
    return jsonify({"message": "Logged out successfully"}), 200


# ============================================================
# USER MANAGEMENT ROUTES
# ============================================================


@app.route("/api/users", methods=["GET"])
def get_users():
    """Get all users"""
    try:
        if not os.path.exists(USERS_CSV):
            return jsonify([]), 200
        df = pd.read_csv(USERS_CSV)
        users = []
        for _, row in df.iterrows():
            users.append(
                {
                    "plate": str(row.get("plate", "")).strip(),
                    "rfid_uid": str(row.get("rfid_uid", "")).strip(),
                    "owner_name": row.get("owner", "N/A"),
                    "email": str(row.get("Email", "N/A")).strip(),
                    "phone": (
                        str(row.get("phone", "")).strip()
                        if "phone" in row and pd.notna(row.get("phone"))
                        else ""
                    ),
                    "balance_da": float(row.get("balance_da", 0) or 0),
                    "balance": float(row.get("balance_da", 0) or 0),
                    "is_active": bool(row.get("active", True)),
                    "active": bool(row.get("active", True)),
                    "vehicle_img": row.get("vehicle_img", ""),
                    "vehicle_type": row.get("vehicle_img", ""),
                }
            )
        return jsonify(users), 200
    except Exception as e:
        print(f"❌ Error getting users: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/users", methods=["POST"])
def add_user():
    """Add new user"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        plate = data.get("plateNumber") or data.get("plate")
        rfid_uid = data.get("rfidUid") or data.get("rfid_uid")
        owner = data.get("ownerName") or data.get("owner")
        email = data.get("email") or data.get("Email")
        phone = data.get("phone", "")
        balance_da = data.get("initialBalance") or data.get("balance_da", 0)
        vehicle_img = data.get("vehicleType") or data.get("vehicle_img", "")
        active = data.get("active", True)

        if not all([plate, rfid_uid, owner, email]):
            return jsonify({"error": "Missing required fields"}), 400

        if os.path.exists(USERS_CSV):
            df = pd.read_csv(USERS_CSV)
        else:
            df = pd.DataFrame(
                columns=[
                    "plate",
                    "rfid_uid",
                    "owner",
                    "Email",
                    "phone",
                    "balance_da",
                    "active",
                    "vehicle_img",
                ]
            )

        if "phone" not in df.columns:
            df["phone"] = ""

        df["plate"] = df["plate"].astype(str).str.strip()
        if str(plate).strip() in df["plate"].values:
            return jsonify({"error": "User already exists"}), 409

        new_user = pd.DataFrame(
            [
                {
                    "plate": str(plate).strip(),
                    "rfid_uid": str(rfid_uid).strip(),
                    "owner": str(owner).strip(),
                    "Email": str(email).strip(),
                    "phone": str(phone).strip(),
                    "balance_da": float(balance_da),
                    "active": bool(active),
                    "vehicle_img": str(vehicle_img),
                }
            ]
        )
        df = pd.concat([df, new_user], ignore_index=True)
        df.to_csv(USERS_CSV, index=False)

        print(f"✅ User added: {plate}")
        broadcast_users_update()
        return (
            jsonify(
                {
                    "message": "User added successfully",
                    "user": new_user.to_dict("records")[0],
                }
            ),
            201,
        )
    except Exception as e:
        print(f"❌ Error adding user: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/users/<plate>", methods=["PUT"])
def update_user(plate):
    """Update user"""
    try:
        data = request.json
        if not data or not os.path.exists(USERS_CSV):
            return jsonify({"error": "Invalid request"}), 400

        df = pd.read_csv(USERS_CSV)
        df["plate"] = df["plate"].astype(str).str.strip()

        if str(plate).strip() not in df["plate"].values:
            return jsonify({"error": "User not found"}), 404

        idx = df[df["plate"] == str(plate).strip()].index[0]

        if "phone" not in df.columns:
            df["phone"] = ""

        for key, col in [
            ("rfidUid", "rfid_uid"),
            ("ownerName", "owner"),
            ("email", "Email"),
            ("phone", "phone"),
            ("initialBalance", "balance_da"),
            ("vehicleType", "vehicle_img"),
            ("active", "active"),
        ]:
            value = data.get(key) or data.get(col)
            if value is not None:
                if col == "balance_da":
                    df.at[idx, col] = float(value)
                elif col == "active":
                    df.at[idx, col] = bool(value)
                else:
                    df.at[idx, col] = str(value).strip()

        df.to_csv(USERS_CSV, index=False)
        print(f"✅ User updated: {plate}")
        broadcast_users_update()
        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        print(f"❌ Error updating user: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/users/<plate>", methods=["DELETE"])
def delete_user(plate):
    """Delete user"""
    try:
        if not os.path.exists(USERS_CSV):
            return jsonify({"error": "Users file not found"}), 404

        df = pd.read_csv(USERS_CSV)
        df["plate"] = df["plate"].astype(str).str.strip()

        if str(plate).strip() not in df["plate"].values:
            return jsonify({"error": "User not found"}), 404

        df = df[df["plate"] != str(plate).strip()]
        df.to_csv(USERS_CSV, index=False)

        # Delete user notifications
        if plate in notifications_store:
            del notifications_store[plate]

        print(f"✅ User deleted: {plate}")
        broadcast_users_update()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        print(f"❌ Error deleting user: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/users/<plate>", methods=["GET"])
def get_user(plate):
    """Get single user"""
    try:
        if not os.path.exists(USERS_CSV):
            return jsonify({"error": "Users file not found"}), 404

        df = pd.read_csv(USERS_CSV)
        df["plate"] = df["plate"].astype(str).str.strip()

        if str(plate).strip() not in df["plate"].values:
            return jsonify({"error": "User not found"}), 404

        user = df[df["plate"] == str(plate).strip()].iloc[0].to_dict()
        return (
            jsonify(
                {
                    "plate": str(user.get("plate", "")),
                    "rfid_uid": str(user.get("rfid_uid", "")),
                    "owner_name": user.get("owner", "N/A"),
                    "email": user.get("Email", "N/A"),
                    "phone": (
                        str(user.get("phone", "")).strip()
                        if "phone" in user and pd.notna(user.get("phone"))
                        else ""
                    ),
                    "balance_da": float(user.get("balance_da", 0) or 0),
                    "balance": float(user.get("balance_da", 0) or 0),
                    "is_active": user.get("active", True),
                    "active": user.get("active", True),
                    "vehicle_img": user.get("vehicle_img", ""),
                    "vehicle_type": user.get("vehicle_img", ""),
                }
            ),
            200,
        )
    except Exception as e:
        print(f"❌ Error getting user: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================
# TOLL EVENTS & ANALYTICS
# ============================================================


@app.route("/api/toll-events", methods=["GET"])
def get_toll_events():
    """Get all toll events"""
    try:
        if not os.path.exists(TOLL_LOG_CSV):
            return jsonify([]), 200
        df = pd.read_csv(TOLL_LOG_CSV)
        return jsonify(df.to_dict("records")), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """Get system analytics"""
    return jsonify(calculate_analytics()), 200


# ============================================================
# RECHARGE REQUESTS
# ============================================================


@app.route("/api/admin/recharge-requests", methods=["GET"])
def get_recharge_requests():
    """Get all recharge requests"""
    return jsonify(recharge_requests), 200


@app.route("/api/admin/recharge/<int:request_id>/approve", methods=["POST", "PUT"])
def approve_recharge(request_id):
    """Approve recharge request"""
    try:
        req = next((r for r in recharge_requests if r["id"] == request_id), None)
        if not req:
            return jsonify({"error": "Request not found"}), 404

        if not os.path.exists(USERS_CSV):
            return jsonify({"error": "Users file not found"}), 404

        df = pd.read_csv(USERS_CSV)
        df["plate"] = df["plate"].astype(str).str.strip()

        if str(req["plate"]).strip() in df["plate"].values:
            current_balance = float(
                df.loc[df["plate"] == str(req["plate"]).strip(), "balance_da"].values[0]
            )
            new_balance = current_balance + float(req["amount"])
            df.loc[df["plate"] == str(req["plate"]).strip(), "balance_da"] = new_balance
            df.to_csv(USERS_CSV, index=False)

            req["status"] = "approved"
            req["approved_at"] = datetime.now().isoformat()

            socketio.emit(
                "recharge_approved", {"type": "recharge_approved", "request": req}
            )
            broadcast_users_update()

            print(
                f"✅ Recharge approved: {req['plate']} +{req['amount']} DA → {new_balance} DA"
            )
            return (
                jsonify({"message": "Recharge approved successfully", "request": req}),
                200,
            )

        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        print(f"❌ Error approving recharge: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/recharge/<int:request_id>/reject", methods=["POST", "PUT"])
def reject_recharge(request_id):
    """Reject recharge request"""
    try:
        data = request.json or {}
        reason = data.get("reason", "No reason provided")

        req = next((r for r in recharge_requests if r["id"] == request_id), None)
        if not req:
            return jsonify({"error": "Request not found"}), 404

        req["status"] = "rejected"
        req["rejection_reason"] = reason
        req["rejected_at"] = datetime.now().isoformat()

        socketio.emit(
            "recharge_rejected", {"type": "recharge_rejected", "request": req}
        )

        print(
            f"✅ Recharge rejected: {req['plate']} -{req['amount']} DA (Reason: {reason})"
        )
        return (
            jsonify({"message": "Recharge rejected successfully", "request": req}),
            200,
        )

    except Exception as e:
        print(f"❌ Error rejecting recharge: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/<plate>/recharge", methods=["POST"])
def request_recharge(plate):
    """User submits recharge request"""
    try:
        data = request.json or {}
        amount = float(data.get("amount", 0))
        if amount <= 0:
            return jsonify({"error": "Invalid amount"}), 400

        new_request = {
            "id": len(recharge_requests) + 1,
            "plate": str(plate).strip(),
            "amount": amount,
            "payment_method": data.get("payment_method")
            or data.get("paymentMethod", "card"),
            "status": "pending",
            "created_at": datetime.now().isoformat(),
        }
        recharge_requests.append(new_request)

        socketio.emit(
            "new_recharge_request",
            {"type": "new_recharge_request", "request": new_request},
        )

        print(f"✅ Recharge request: {plate} +{amount} DA")
        return jsonify({"message": "Request submitted", "request": new_request}), 201
    except Exception as e:
        print(f"❌ Error submitting recharge: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================
# NOTIFICATION ROUTES - ENHANCED WITH DELETE SUPPORT
# ============================================================


@app.route("/api/user/<plate>/notifications", methods=["GET"])
def user_notifications(plate):
    """Get user notifications"""
    try:
        if plate not in notifications_store:
            notifications_store[plate] = [
                {
                    "id": notification_counter["user"],
                    "type": "info",
                    "title": "Welcome to Smart Toll System",
                    "message": "Your account is active and ready to use.",
                    "category": "system",
                    "is_read": False,
                    "read": False,
                    "important": False,
                    "created_at": datetime.now().isoformat(),
                }
            ]
            notification_counter["user"] += 1
        return jsonify(notifications_store[plate]), 200
    except Exception as e:
        print(f"❌ Error getting notifications: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/notifications", methods=["GET"])
def admin_notifications():
    """Get admin notifications"""
    try:
        if "admin" not in notifications_store:
            notifications_store["admin"] = [
                {
                    "id": notification_counter["admin"],
                    "type": "info",
                    "title": "Admin Panel Active",
                    "message": "System is running smoothly.",
                    "category": "system",
                    "is_read": False,
                    "read": False,
                    "important": False,
                    "created_at": datetime.now().isoformat(),
                }
            ]
            notification_counter["admin"] += 1
        return jsonify(notifications_store["admin"]), 200
    except Exception as e:
        print(f"❌ Error getting admin notifications: {e}")
        return jsonify({"error": str(e)}), 500


@app.route(
    "/api/user/<plate>/notifications/<int:notification_id>/read", methods=["PUT"]
)
def mark_notification_read(plate, notification_id):
    """Mark notification as read"""
    try:
        if plate in notifications_store:
            for notif in notifications_store[plate]:
                if notif["id"] == notification_id:
                    notif["is_read"] = True
                    notif["read"] = True
                    print(
                        f"✅ Marked notification {notification_id} as read for {plate}"
                    )
                    return jsonify({"message": "Marked as read"}), 200
        return jsonify({"error": "Notification not found"}), 404
    except Exception as e:
        print(f"❌ Error marking as read: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/<plate>/notifications/mark-all-read", methods=["PUT"])
def mark_all_notifications_read(plate):
    """Mark all notifications as read"""
    try:
        if plate in notifications_store:
            for notif in notifications_store[plate]:
                notif["is_read"] = True
                notif["read"] = True
            print(f"✅ Marked all notifications as read for {plate}")
            return jsonify({"message": "All marked as read"}), 200
        return jsonify({"message": "No notifications found"}), 200
    except Exception as e:
        print(f"❌ Error marking all as read: {e}")
        return jsonify({"error": str(e)}), 500


@app.route(
    "/api/user/<plate>/notifications/<int:notification_id>/important", methods=["PUT"]
)
def toggle_notification_important(plate, notification_id):
    """Toggle notification importance"""
    try:
        if plate in notifications_store:
            for notif in notifications_store[plate]:
                if notif["id"] == notification_id:
                    notif["important"] = not notif.get("important", False)
                    print(f"✅ Toggled importance for notification {notification_id}")
                    return jsonify({"message": "Importance toggled"}), 200
        return jsonify({"error": "Notification not found"}), 404
    except Exception as e:
        print(f"❌ Error toggling importance: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/<plate>/notifications/<int:notification_id>", methods=["DELETE"])
def delete_notification(plate, notification_id):
    """Delete single notification"""
    try:
        if plate in notifications_store:
            initial_count = len(notifications_store[plate])
            notifications_store[plate] = [
                n for n in notifications_store[plate] if n["id"] != notification_id
            ]
            if len(notifications_store[plate]) < initial_count:
                print(f"✅ Deleted notification {notification_id} for {plate}")
                socketio.emit(
                    "notification_deleted",
                    {
                        "type": "notification_deleted",
                        "plate": plate,
                        "notification_id": notification_id,
                    },
                )
                return jsonify({"message": "Notification deleted successfully"}), 200
        return jsonify({"error": "Notification not found"}), 404
    except Exception as e:
        print(f"❌ Error deleting notification: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/<plate>/notifications/batch-delete", methods=["POST"])
def batch_delete_notifications(plate):
    """Batch delete notifications"""
    try:
        data = request.json or {}
        notification_ids = data.get("notification_ids", [])

        if not notification_ids:
            return jsonify({"error": "No notification IDs provided"}), 400

        if plate in notifications_store:
            initial_count = len(notifications_store[plate])
            notifications_store[plate] = [
                n for n in notifications_store[plate] if n["id"] not in notification_ids
            ]
            deleted_count = initial_count - len(notifications_store[plate])

            print(f"✅ Batch deleted {deleted_count} notifications for {plate}")
            socketio.emit(
                "notifications_batch_deleted",
                {
                    "type": "notifications_batch_deleted",
                    "plate": plate,
                    "deleted_count": deleted_count,
                },
            )

            return (
                jsonify(
                    {
                        "message": f"{deleted_count} notifications deleted successfully",
                        "deleted_count": deleted_count,
                    }
                ),
                200,
            )

        return jsonify({"error": "No notifications found"}), 404
    except Exception as e:
        print(f"❌ Error batch deleting notifications: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/notifications/<int:notification_id>", methods=["DELETE"])
def admin_delete_notification(notification_id):
    """Admin delete notification"""
    try:
        if "admin" in notifications_store:
            initial_count = len(notifications_store["admin"])
            notifications_store["admin"] = [
                n for n in notifications_store["admin"] if n["id"] != notification_id
            ]
            if len(notifications_store["admin"]) < initial_count:
                print(f"✅ Admin deleted notification {notification_id}")
                socketio.emit(
                    "admin_notification_deleted",
                    {
                        "type": "admin_notification_deleted",
                        "notification_id": notification_id,
                    },
                )
                return jsonify({"message": "Notification deleted successfully"}), 200
        return jsonify({"error": "Notification not found"}), 404
    except Exception as e:
        print(f"❌ Error deleting admin notification: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/notifications/batch-delete", methods=["POST"])
def admin_batch_delete_notifications():
    """Admin batch delete notifications"""
    try:
        data = request.json or {}
        notification_ids = data.get("notification_ids", [])

        if not notification_ids:
            return jsonify({"error": "No notification IDs provided"}), 400

        if "admin" in notifications_store:
            initial_count = len(notifications_store["admin"])
            notifications_store["admin"] = [
                n
                for n in notifications_store["admin"]
                if n["id"] not in notification_ids
            ]
            deleted_count = initial_count - len(notifications_store["admin"])

            print(f"✅ Admin batch deleted {deleted_count} notifications")
            socketio.emit(
                "admin_notifications_batch_deleted",
                {
                    "type": "admin_notifications_batch_deleted",
                    "deleted_count": deleted_count,
                },
            )

            return (
                jsonify(
                    {
                        "message": f"{deleted_count} notifications deleted successfully",
                        "deleted_count": deleted_count,
                    }
                ),
                200,
            )

        return jsonify({"error": "No notifications found"}), 404
    except Exception as e:
        print(f"❌ Error admin batch deleting notifications: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ============================================================
# SYSTEM SETTINGS
# ============================================================


@app.route("/api/admin/settings", methods=["GET", "PUT"])
def admin_settings():
    """Get or update settings"""
    settings_file = os.path.join(BASE_DIR, "settings.json")

    if request.method == "GET":
        if os.path.exists(settings_file):
            with open(settings_file, "r") as f:
                return jsonify(json.load(f)), 200
        return (
            jsonify(
                {
                    "tollFee": 50,
                    "lowBalanceThreshold": 100,
                    "systemName": "Smart Toll System",
                    "enableNotifications": True,
                }
            ),
            200,
        )

    data = request.json or {}
    with open(settings_file, "w") as f:
        json.dump(data, f, indent=2)

    socketio.emit("settings_updated", {"type": "settings_updated", "settings": data})
    return jsonify({"message": "Settings updated"}), 200


# ============================================================
# SNAPSHOTS & MEDIA
# ============================================================


@app.route("/api/snapshots", methods=["GET"])
def get_snapshots():
    """Get snapshots"""
    try:
        if not os.path.exists(SNAPSHOTS_DIR):
            return jsonify([]), 200

        snapshots = []
        files = [
            f
            for f in os.listdir(SNAPSHOTS_DIR)
            if f.lower().endswith((".png", ".jpg", ".jpeg"))
        ]

        files.sort(
            key=lambda x: os.path.getmtime(os.path.join(SNAPSHOTS_DIR, x)), reverse=True
        )
        files = files[:50]

        for filename in files:
            filepath = os.path.join(SNAPSHOTS_DIR, filename)
            snapshots.append(
                {
                    "filename": filename,
                    "path": f"/snapshots/{filename}",
                    "url": f"http://localhost:5000/snapshots/{filename}",
                    "created_at": datetime.fromtimestamp(
                        os.path.getmtime(filepath)
                    ).isoformat(),
                    "size": os.path.getsize(filepath),
                }
            )

        return jsonify(snapshots), 200
    except Exception as e:
        print(f"❌ Error getting snapshots: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/snapshots/<path:filename>")
def serve_snapshot(filename):
    """Serve snapshot"""
    return send_from_directory(SNAPSHOTS_DIR, filename)


# ============================================================
# USER-SPECIFIC ROUTES
# ============================================================


@app.route("/api/user/<plate>/transactions", methods=["GET"])
def user_transactions(plate):
    """Get user transactions"""
    try:
        if not os.path.exists(TOLL_LOG_CSV):
            return jsonify([]), 200
        df = pd.read_csv(TOLL_LOG_CSV)
        df["Plate"] = df["Plate"].astype(str).str.strip()
        return jsonify(df[df["Plate"] == str(plate).strip()].to_dict("records")), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
# WEBSOCKET EVENTS
# ============================================================


@socketio.on("connect")
def handle_connect():
    """Handle connection"""
    print("✅ Client connected")
    emit(
        "connection_response",
        {
            "status": "connected",
            "message": "Connected",
            "analytics": calculate_analytics(),
            "timestamp": datetime.now().isoformat(),
        },
    )

    try:
        if os.path.exists(TOLL_LOG_CSV):
            df = pd.read_csv(TOLL_LOG_CSV)
            emit(
                "initial_events",
                {"type": "initial_events", "events": df.tail(10).to_dict("records")},
            )
    except Exception:
        pass


@socketio.on("disconnect")
def handle_disconnect():
    """Handle disconnection"""
    print("❌ Client disconnected")


@socketio.on("ping")
def handle_ping():
    """Handle ping"""
    emit("pong", {"status": "alive", "timestamp": datetime.now().isoformat()})


@socketio.on("request_refresh")
def handle_refresh_request():
    """Handle refresh"""
    emit(
        "analytics_update", {"type": "analytics_update", "data": calculate_analytics()}
    )


# ============================================================
# TEST DATA CREATION ENDPOINTS (FOR DEVELOPMENT ONLY)
# ============================================================


@app.route("/api/test/create-notifications", methods=["POST"])
def create_test_notifications():
    """Create test notifications for testing (Admin & User)"""
    try:
        data = request.json or {}
        notification_type = data.get("type", "both")  # 'admin', 'user', or 'both'
        plate = data.get("plate", "ABC123")  # For user notifications

        created = []

        # Create admin notifications
        if notification_type in ["admin", "both"]:
            if "admin" not in notifications_store:
                notifications_store["admin"] = []

            admin_notifs = [
                {
                    "id": notification_counter["admin"],
                    "type": "warning",
                    "title": "System Alert",
                    "message": "High traffic detected on toll gate #3. Please monitor.",
                    "category": "system",
                    "is_read": False,
                    "read": False,
                    "important": True,
                    "created_at": datetime.now().isoformat(),
                },
                {
                    "id": notification_counter["admin"] + 1,
                    "type": "success",
                    "title": "Backup Completed",
                    "message": "Daily system backup completed successfully.",
                    "category": "system",
                    "is_read": False,
                    "read": False,
                    "important": False,
                    "created_at": datetime.now().isoformat(),
                },
                {
                    "id": notification_counter["admin"] + 2,
                    "type": "info",
                    "title": "New User Registration",
                    "message": "A new user has registered: XYZ789",
                    "category": "users",
                    "is_read": False,
                    "read": False,
                    "important": False,
                    "created_at": datetime.now().isoformat(),
                },
                {
                    "id": notification_counter["admin"] + 3,
                    "type": "error",
                    "title": "Payment Gateway Error",
                    "message": "Connection to payment gateway failed. Please check configuration.",
                    "category": "system",
                    "is_read": False,
                    "read": False,
                    "important": True,
                    "created_at": datetime.now().isoformat(),
                },
            ]

            notifications_store["admin"].extend(admin_notifs)
            notification_counter["admin"] += len(admin_notifs)
            created.append(f"{len(admin_notifs)} admin notifications")

        # Create user notifications
        if notification_type in ["user", "both"]:
            if plate not in notifications_store:
                notifications_store[plate] = []

            user_notifs = [
                {
                    "id": notification_counter["user"],
                    "type": "success",
                    "title": "Payment Successful",
                    "message": "Your toll payment of 50 DA was processed successfully.",
                    "category": "payment",
                    "is_read": False,
                    "read": False,
                    "important": False,
                    "created_at": datetime.now().isoformat(),
                },
                {
                    "id": notification_counter["user"] + 1,
                    "type": "warning",
                    "title": "Low Balance Alert",
                    "message": "Your account balance is running low (100 DA). Please recharge soon.",
                    "category": "balance",
                    "is_read": False,
                    "read": False,
                    "important": True,
                    "created_at": datetime.now().isoformat(),
                },
                {
                    "id": notification_counter["user"] + 2,
                    "type": "info",
                    "title": "Recharge Approved",
                    "message": "Your recharge request of 500 DA has been approved.",
                    "category": "recharge",
                    "is_read": False,
                    "read": False,
                    "important": False,
                    "created_at": datetime.now().isoformat(),
                },
                {
                    "id": notification_counter["user"] + 3,
                    "type": "success",
                    "title": "Trip Completed",
                    "message": "Your toll passage was recorded. Thank you for using Smart Toll.",
                    "category": "trip",
                    "is_read": False,
                    "read": False,
                    "important": False,
                    "created_at": datetime.now().isoformat(),
                },
            ]

            notifications_store[plate].extend(user_notifs)
            notification_counter["user"] += len(user_notifs)
            created.append(f"{len(user_notifs)} user notifications for {plate}")

        # Broadcast update via WebSocket
        socketio.emit(
            "notifications_updated",
            {"type": "notifications_updated", "message": "Test notifications created"},
        )

        print(f"✅ Created test notifications: {created}")

        return (
            jsonify(
                {
                    "message": "Test notifications created successfully",
                    "created": created,
                }
            ),
            201,
        )

    except Exception as e:
        print(f"❌ Error creating test notifications: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/test/clear-notifications", methods=["POST"])
def clear_test_notifications():
    """Clear all notifications (FOR TESTING ONLY)"""
    try:
        data = request.json or {}
        target = data.get("target", "all")  # 'admin', 'user', 'all'

        if target in ["admin", "all"]:
            notifications_store["admin"] = []
            print(f"✅ Cleared admin notifications")

        if target in ["user", "all"]:
            # Clear all user notifications
            user_keys = [k for k in notifications_store.keys() if k != "admin"]
            for key in user_keys:
                notifications_store[key] = []
            print(f"✅ Cleared user notifications for {len(user_keys)} users")

        return jsonify({"message": f"Cleared {target} notifications"}), 200

    except Exception as e:
        print(f"❌ Error clearing notifications: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================================
# SERVER STARTUP
# ============================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 Smart Toll System - Flask API Server")
    print("=" * 60)
    print("📡 HTTP: http://localhost:5000")
    print("🔌 WebSocket: ws://localhost:5000")
    print("=" * 60)
    print("\n🔐 Authentication:")
    print(f"   Admin login configured: {bool(ADMIN_PASSWORD)}")
    print(f"   User login configured:  {bool(USER_PASSWORD)}")
    print("=" * 60 + "\n")

    socketio.run(
        app,
        host=os.getenv("FLASK_HOST", "127.0.0.1"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() in {"1", "true", "yes"},
        allow_unsafe_werkzeug=True,
    )
