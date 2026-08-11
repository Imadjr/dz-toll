"""
DzTollCollection System v3.0 - ULTIMATE CRASH-PROOF
CSV FORMAT: BULLETPROOF - Dashboard will NEVER crash
- RFID: FFFFFFFF for denied entries
- Balance: 000 for unknown vehicles
- Thread-safe CSV writing
"""

# flake8: noqa: E501
import os
import time
import csv
import cv2
import pytesseract
import serial
import pandas as pd
from ultralytics import YOLO
from datetime import datetime
import threading
import queue
from dotenv import load_dotenv
import smtplib
from email.message import EmailMessage
from ultralytics.nn.tasks import DetectionModel
import torch
import logging

# ==============================
# LOGGING CONFIGURATION
# ==============================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("smart_toll_system.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# ==============================
# ENVIRONMENT CONFIGURATION
# ==============================

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Email Configuration
ALERT_EMAIL = os.getenv("ALERT_EMAIL")
SMTP_USER = os.getenv("SMTP_USER")
SMTP_APP_PWD = os.getenv("SMTP_APP_PWD")
EMAIL_ENABLED = bool(ALERT_EMAIL and SMTP_USER and SMTP_APP_PWD)

# ==============================
# SYSTEM PATHS
# ==============================

# Tesseract OCR. Leave unset when tesseract is available on PATH.
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "").strip()
if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# YOLO model
MODEL_PATH = os.getenv(
    "MODEL_PATH",
    os.path.join(PROJECT_DIR, "models", "license_plate", "best.pt"),
)

# Arduino
ARDUINO_PORT = os.getenv("ARDUINO_PORT", "COM3")
BAUD_RATE = int(os.getenv("BAUD_RATE", "9600"))

# Camera
CAM_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
CAP_WIDTH = int(os.getenv("CAMERA_WIDTH", "640"))
CAP_HEIGHT = int(os.getenv("CAMERA_HEIGHT", "360"))
IMGSIZE = int(os.getenv("YOLO_IMAGE_SIZE", "320"))
FRAME_SKIP = int(os.getenv("FRAME_SKIP", "4"))

# Runtime data
USERS_CSV = os.path.join(BACKEND_DIR, "users.csv")
LOG_CSV = os.path.join(BACKEND_DIR, "toll_log.csv")
SNAPSHOT_DIR = os.path.join(BACKEND_DIR, "snapshots")
os.makedirs(SNAPSHOT_DIR, exist_ok=True)

# ==============================
# SYSTEM PARAMETERS
# ==============================

FEE_DA = float(os.getenv("TOLL_FEE_DA", "50"))
LOCATION = os.getenv("TOLL_LOCATION", "Gate A")
OCR_INTERVAL = float(os.getenv("OCR_INTERVAL", "6"))
TIMEOUT_RFID = float(os.getenv("RFID_TIMEOUT", "7"))
PLATE_COOLDOWN = float(os.getenv("PLATE_COOLDOWN", "10"))

# Display
WINDOW_NAME = "DzToll v3.0"
SHOW_VIDEO = os.getenv("SHOW_VIDEO", "true").lower() in {"1", "true", "yes"}

# ==============================
# GLOBAL VARIABLES
# ==============================

last_plate_text = ""
last_plate_time = 0
arduino_queue = queue.Queue()
transaction_history = {}
csv_write_lock = threading.Lock()

# ==============================
# CSV HEADERS
# ==============================

TOLL_LOG_HEADERS = [
    "Timestamp",
    "Plate",
    "RFID_UID",
    "Status",
    "Fee_DA",
    "Balance_Before",
    "Balance_After",
    "Location",
    "Snapshot",
]

USERS_CSV_HEADERS = [
    "plate",
    "rfid_uid",
    "owner",
    "Email",
    "phone",
    "balance_da",
    "active",
    "vehicle_img",
]

# ==============================
# EMAIL SYSTEM
# ==============================


def send_email_notification(subject, body, recipient_email, attachment_path=None):
    """Send email with snapshot"""
    if not EMAIL_ENABLED:
        return

    def send_async():
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = SMTP_USER
            msg["To"] = recipient_email
            msg.set_content(body)

            if attachment_path and os.path.exists(attachment_path):
                try:
                    with open(attachment_path, "rb") as f:
                        file_data = f.read()
                        file_name = os.path.basename(attachment_path)
                    msg.add_attachment(
                        file_data, maintype="image", subtype="jpeg", filename=file_name
                    )
                except Exception as e:
                    logger.error(f"Attach failed: {e}")

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
                smtp.login(SMTP_USER, SMTP_APP_PWD)
                smtp.send_message(msg)

            logger.info(f"Email sent to {recipient_email}")
        except Exception as e:
            logger.error(f"Email failed: {e}")

    threading.Thread(target=send_async, daemon=True).start()


# ==============================
# ARDUINO
# ==============================


def init_arduino(port, baud):
    """Initialize Arduino"""
    try:
        ser = serial.Serial(port, baud, timeout=1)
        time.sleep(2)
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        logger.info(f"Arduino connected on {port}")
        return ser
    except Exception as e:
        logger.error(f"Arduino failed: {e}")
        logger.warning("System continues without Arduino")
        return None


def arduino_reader(ser, q):
    """Background reader"""
    while True:
        try:
            if ser and ser.in_waiting:
                line = ser.readline().decode(errors="ignore").strip()
                if line:
                    q.put(line)
            time.sleep(0.01)
        except Exception as e:
            logger.error(f"Arduino read error: {e}")
            break


def send_arduino_command(ser, command):
    """Send command"""
    if ser:
        try:
            ser.write((command + "\n").encode())
            logger.info(f"Arduino: {command}")
        except Exception as e:
            logger.error(f"Arduino send error: {e}")


def read_arduino_response(timeout_sec):
    """Read response with timeout"""
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            response = arduino_queue.get_nowait()
            logger.info(f"Arduino: {response}")
            return response
        except queue.Empty:
            time.sleep(0.01)
    logger.warning(f"Arduino timeout ({timeout_sec}s)")
    return None


# ==============================
# OCR
# ==============================


def preprocess_for_ocr(plate_img):
    """Preprocess image for OCR"""
    gray = cv2.cvtColor(plate_img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    gray = cv2.bilateralFilter(gray, 5, 60, 60)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10
    )
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    scaled = cv2.resize(opened, None, fx=2.2, fy=2.2, interpolation=cv2.INTER_LINEAR)
    return scaled


def perform_ocr(img):
    """Extract text using Tesseract"""
    config = (
        "--psm 7 --oem 3 -c "
        "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    )
    try:
        text_raw = pytesseract.image_to_string(img, config=config)
        text = "".join(filter(str.isalnum, text_raw)).strip().upper()
        return text if text else "N/A"
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return "N/A"


# ==============================
# FILE OPERATIONS
# ==============================


def save_snapshot(frame, plate_text):
    """Save snapshot"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_plate = (
        "".join(c if c.isalnum() else "_" for c in plate_text)[:24] or "UNKNOWN"
    )
    filename = f"{timestamp}_{safe_plate}.jpg"
    filepath = os.path.join(SNAPSHOT_DIR, filename)

    try:
        cv2.imwrite(filepath, frame)
        logger.info(f"Snapshot: {filepath}")
        return filename
    except Exception as e:
        logger.error(f"Snapshot failed: {e}")
        return "no_snapshot.jpg"


def append_toll_log(
    timestamp, plate, rfid_uid, status, fee, bal_before, bal_after, location, snapshot
):
    """
    BULLETPROOF CSV LOGGING
    - RFID: FFFFFFFF for denied
    - Balance: 000 for unknown
    """
    with csv_write_lock:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Ensure file exists
                if not os.path.exists(LOG_CSV) or os.path.getsize(LOG_CSV) == 0:
                    with open(LOG_CSV, "w", newline="", encoding="utf-8") as f:
                        csv.writer(f).writerow(TOLL_LOG_HEADERS)

                # CRITICAL: Format for bulletproof CSV
                # RFID: FFFFFFFF if empty (not N/A)
                if not rfid_uid or rfid_uid.strip() == "":
                    rfid_clean = "FFFFFFFF"
                else:
                    rfid_clean = rfid_uid.strip().upper()

                # Balance: 000 for unknown vehicles
                if bal_before is None or bal_before == "":
                    bal_before = 0
                else:
                    if float(bal_before) == int(bal_before):
                        bal_before = int(bal_before)

                if bal_after is None or bal_after == "":
                    bal_after = 0
                else:
                    if float(bal_after) == int(bal_after):
                        bal_after = int(bal_after)

                # Fee: 00 for denied
                if fee is None or fee == "":
                    fee = 0

                # Write
                with open(LOG_CSV, "a", newline="", encoding="utf-8") as f:
                    csv.writer(f).writerow(
                        [
                            timestamp,
                            plate,
                            rfid_clean,  # FFFFFFFF for denied
                            status,
                            fee,  # 00 for denied
                            bal_before,  # 000 for unknown
                            bal_after,  # 000 for unknown
                            location,
                            snapshot,
                        ]
                    )

                logger.info(f"CSV: {status} - {plate}")
                return True

            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"CSV retry {attempt+1}: {e}")
                    time.sleep(0.1)
                else:
                    logger.error(f"CSV failed: {e}")
                    return False


def read_users():
    """Read users.csv with retry"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            if not os.path.exists(USERS_CSV) or os.path.getsize(USERS_CSV) == 0:
                pd.DataFrame(columns=USERS_CSV_HEADERS).to_csv(USERS_CSV, index=False)
                logger.warning("Created empty users.csv")
                return pd.DataFrame(columns=USERS_CSV_HEADERS)

            df = pd.read_csv(USERS_CSV, dtype=str)

            for col in USERS_CSV_HEADERS:
                if col not in df.columns:
                    df[col] = ""

            df["balance_da"] = (
                pd.to_numeric(df.get("balance_da", "0"), errors="coerce")
                .fillna(0)
                .astype(float)
            )

            df["active"] = (
                df.get("active", "true")
                .astype(str)
                .str.lower()
                .isin(["true", "1", "yes", "active"])
            )

            df["plate"] = (
                df["plate"].astype(str).str.strip().str.replace(".0", "", regex=False)
            )
            df["rfid_uid"] = (
                df["rfid_uid"].astype(str).str.strip().str.upper().str.replace(" ", "")
            )

            logger.debug(f"Loaded {len(df)} users")
            return df

        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(0.1)
            else:
                logger.error(f"Read users failed: {e}")
                return pd.DataFrame(columns=USERS_CSV_HEADERS)


def update_user_balance(plate, new_balance):
    """Update balance with retry"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            df = read_users()
            df.loc[df["plate"] == plate, "balance_da"] = new_balance
            df.to_csv(USERS_CSV, index=False)
            logger.info(f"Balance updated: {plate} = {new_balance} DA")
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(0.1)
            else:
                logger.error(f"Update balance failed: {e}")
                return False


# ==============================
# TRANSACTION PROCESSING
# ==============================


def process_toll_transaction(plate_text, frame, arduino):
    """Process transaction with spam prevention"""
    global last_plate_text, last_plate_time, transaction_history

    current_time = time.time()

    # Cooldown check
    if plate_text in transaction_history:
        last_transaction_time = transaction_history[plate_text]
        time_since_last = current_time - last_transaction_time

        if time_since_last < PLATE_COOLDOWN:
            logger.warning(f"Cooldown: {plate_text} " f"({time_since_last:.1f}s ago)")
            return "SKIPPED", "Cooldown active"

    transaction_history[plate_text] = current_time
    transaction_history = {
        k: v for k, v in transaction_history.items() if (current_time - v) < 60
    }

    # Save snapshot
    snapshot_filename = save_snapshot(frame, plate_text)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # SAFE DEFAULTS
    status = "DENIED"
    reason = "Unknown plate"
    fee = 0
    balance_before = 0
    balance_after = 0
    rfid_uid = ""  # Will become FFFFFFFF if empty
    user_email = None
    user_name = None

    # Check database
    users = read_users()
    matched_user = users[users["plate"] == str(plate_text).strip()]

    plate_known = not matched_user.empty

    if plate_known:
        logger.info(f"Known vehicle: {plate_text}")

        if arduino:
            arduino.reset_input_buffer()
            arduino.reset_output_buffer()

        send_arduino_command(arduino, "WAIT_RFID")
        response = read_arduino_response(TIMEOUT_RFID)

        if response and response.startswith("RFID="):
            rfid_uid = response.replace("RFID=", "").strip().upper().replace(" ", "")
            logger.info(f"RFID: {rfid_uid}")

            if not matched_user.empty:
                for idx, row in matched_user.iterrows():
                    row_rfid = (
                        str(row.get("rfid_uid", "")).strip().upper().replace(" ", "")
                    )
                    is_active = bool(row.get("active", True))
                    balance_before = float(row.get("balance_da", 0))
                    user_email = str(row.get("Email", ""))
                    user_name = str(row.get("owner", "Unknown"))

                    logger.info(f"User: {user_name}")
                    logger.info(f"Balance: {balance_before} DA")

                    if row_rfid != rfid_uid:
                        reason = "RFID mismatch"
                        balance_after = balance_before
                        break

                    if not is_active:
                        reason = "Account inactive"
                        balance_after = balance_before
                        break

                    if balance_before < FEE_DA:
                        reason = (
                            f"Insufficient balance "
                            f"({balance_before} DA < {FEE_DA} DA)"
                        )
                        balance_after = balance_before
                        break

                    status = "GRANTED"
                    fee = FEE_DA
                    balance_after = balance_before - FEE_DA
                    reason = "Authorized"

                    update_user_balance(plate_text, balance_after)

                    logger.info("ACCESS GRANTED")
                    logger.info(
                        f"Balance: {balance_before} DA " f"-> {balance_after} DA"
                    )
                    break

        else:
            reason = "No RFID detected"
            logger.warning("No RFID response")
    else:
        reason = "Unknown plate"
        logger.warning(f"Unknown vehicle: {plate_text}")

    send_arduino_command(arduino, "OPEN" if status == "GRANTED" else "DENY")

    # Log with bulletproof format
    append_toll_log(
        timestamp,
        plate_text,
        rfid_uid,  # Empty = FFFFFFFF
        status,
        fee,  # 0 for denied
        balance_before,  # 0 for unknown
        balance_after,  # 0 for unknown
        LOCATION,
        snapshot_filename,
    )

    if EMAIL_ENABLED and user_email:
        subject = f"[TOLL {status}] {plate_text}"
        body = (
            "DzToll Transaction\n"
            f"{'='*50}\n"
            f"Time: {timestamp}\n"
            f"User: {user_name}\n"
            f"Plate: {plate_text}\n"
            f"RFID: {rfid_uid}\n"
            f"Location: {LOCATION}\n"
            f"Status: {status}\n"
            f"Fee: {fee} DA\n"
            f"Previous Balance: {balance_before} DA\n"
            f"New Balance: {balance_after} DA\n"
            f"Reason: {reason}\n"
            f"{'='*50}\n"
        )
        snapshot_path = os.path.join(SNAPSHOT_DIR, snapshot_filename)
        send_email_notification(subject, body, user_email, snapshot_path)

    return status, reason


# ==============================
# MAIN LOOP
# ==============================


def main():
    """Main system loop"""
    global last_plate_text, last_plate_time

    print("\n" + "=" * 70)
    print("DzToll v3.0 - BULLETPROOF EDITION")
    print("=" * 70)
    print(f"Location: {LOCATION}")
    print(f"Toll Fee: {FEE_DA} DA")
    print(f"Backend: {BACKEND_DIR}")
    print(f"Model: {MODEL_PATH}")
    print("=" * 70 + "\n")

    if not os.path.exists(MODEL_PATH):
        logger.error(f"Model not found: {MODEL_PATH}")
        return

    if not os.path.exists(BACKEND_DIR):
        logger.error(f"Backend not found: {BACKEND_DIR}")
        return

    # Arduino
    arduino = init_arduino(ARDUINO_PORT, BAUD_RATE)
    if arduino:
        arduino_thread = threading.Thread(
            target=arduino_reader, args=(arduino, arduino_queue), daemon=True
        )
        arduino_thread.start()

    # YOLO
    logger.info("Loading YOLO...")
    torch.serialization.add_safe_globals(
        {"DFLoss": torch.nn.Module, "DetectionModel": DetectionModel}
    )
    model = YOLO(MODEL_PATH)
    logger.info("YOLO loaded")

    # Camera
    cap = cv2.VideoCapture(CAM_INDEX)
    if not cap.isOpened():
        logger.error("Cannot open camera")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAP_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAP_HEIGHT)
    logger.info("Camera initialized")

    if SHOW_VIDEO:
        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(WINDOW_NAME, CAP_WIDTH, CAP_HEIGHT)

    frame_count = 0
    fps_start = time.time()
    fps_display = 0

    logger.info("System ready")
    print("\nSYSTEM ACTIVE - Press 'q' to quit\n")

    with torch.no_grad():
        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            frame_count += 1
            current_time = time.time()

            if frame_count % FRAME_SKIP != 0:
                if SHOW_VIDEO:
                    display_frame = frame.copy()
                    cv2.putText(
                        display_frame,
                        f"FPS: {fps_display:.1f}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 255),
                        2,
                    )
                    cv2.putText(
                        display_frame,
                        f"Location: {LOCATION}",
                        (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (255, 255, 255),
                        2,
                    )
                    cv2.imshow(WINDOW_NAME, display_frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                continue

            results = model(frame, imgsz=IMGSIZE, verbose=False, device="cpu")[0]

            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                confidence = float(box.conf.cpu().numpy().item())

                if (x2 - x1) < 20 or (y2 - y1) < 10 or confidence < 0.3:
                    continue

                crop = frame[y1:y2, x1:x2]
                if crop.size == 0:
                    continue

                plate_text = None
                needs_ocr = (
                    current_time - last_plate_time > OCR_INTERVAL
                ) or last_plate_text == ""

                if needs_ocr:
                    preprocessed = preprocess_for_ocr(crop)
                    plate_text = perform_ocr(preprocessed)

                    if plate_text == "N/A":
                        continue

                    if plate_text == last_plate_text and (
                        current_time - last_plate_time < PLATE_COOLDOWN
                    ):
                        continue

                    last_plate_text = plate_text
                    last_plate_time = current_time
                else:
                    plate_text = last_plate_text

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame,
                    plate_text,
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 255, 0),
                    2,
                )

                print(f"\n{'='*70}")
                print(f"DETECTED: {plate_text}")
                print(f"{'='*70}")

                status, reason = process_toll_transaction(plate_text, frame, arduino)

                if status != "SKIPPED":
                    print(f"Status: {status}")
                    print(f"Reason: {reason}")
                    print(f"{'='*70}\n")

            elapsed = time.time() - fps_start
            if elapsed > 0:
                fps_display = frame_count / elapsed

            if SHOW_VIDEO:
                display_frame = frame.copy()
                cv2.putText(
                    display_frame,
                    f"FPS: {fps_display:.1f}",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 255),
                    2,
                )
                cv2.putText(
                    display_frame,
                    f"Location: {LOCATION}",
                    (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 255),
                    2,
                )
                cv2.putText(
                    display_frame,
                    f"Fee: {FEE_DA} DA",
                    (10, 90),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 255),
                    2,
                )
                cv2.imshow(WINDOW_NAME, display_frame)

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

    cap.release()
    if SHOW_VIDEO:
        cv2.destroyAllWindows()
    if arduino:
        arduino.close()

    logger.info("System stopped")
    print("\nSYSTEM SHUTDOWN\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        logger.critical(f"FATAL: {e}", exc_info=True)
        print(f"\nFATAL ERROR: {e}")
