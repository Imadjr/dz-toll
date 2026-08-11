#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>

// Pin definitions
#define SS_PIN 10
#define RST_PIN 9
#define BUZZER_PIN 2
#define SERVO_PIN 5

// Objects
MFRC522 mfrc522(SS_PIN, RST_PIN);
Servo gate;

// Display
LiquidCrystal_I2C lcd(0x27, 16, 2);

// State variables
bool waitForRFID = false;
unsigned long waitStartMillis = 0;

// Timing
const unsigned long RFID_TIMEOUT = 15000; // 15 seconds timeout

unsigned long buzzerEndTime = 0;
bool buzzerOn = false;
unsigned long gateCloseTime = 0;
bool gateOpen = false;

void setup() {
  Serial.begin(9600);
  SPI.begin();
  mfrc522.PCD_Init();
  gate.attach(SERVO_PIN);
  gate.write(0); // Closed position

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  lcd.init();
  lcd.backlight();
  showStatus("DzTollReady");
}

void showStatus(const char* message) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(message);
}

void buzzNonBlocking(int duration) {
  digitalWrite(BUZZER_PIN, HIGH);
  buzzerEndTime = millis() + duration;
  buzzerOn = true;
}

void updateOutputs() {
  unsigned long now = millis();

  if (buzzerOn && now >= buzzerEndTime) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerOn = false;
  }

  if (gateOpen && now >= gateCloseTime) {
    gate.write(0); // Close gate
    gateOpen = false;
  }
}

void grantAccess() {
  showStatus("Access Granted");
  gate.write(90);
  gateOpen = true;
  gateCloseTime = millis() + 1500;
  buzzNonBlocking(300);
}

void denyAccess() {
  showStatus("Access Denied");
  buzzNonBlocking(1000);
  gateCloseTime = millis() + 1500; // In case gate was opened mistakenly
}

void startRFIDWait() {
  waitForRFID = true;
  waitStartMillis = millis();
  showStatus("Waiting for Card");
  buzzNonBlocking(200);
}

void handleSerialCommands() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd.equalsIgnoreCase("WAIT_RFID")) {
      startRFIDWait();
    } else if (cmd.equalsIgnoreCase("OPEN")) {
      grantAccess();
    } else if (cmd.equalsIgnoreCase("DENY")) {
      denyAccess();
    }
  }
}

void handleRFID() {
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String uidStr = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) uidStr += "0";
      uidStr += String(mfrc522.uid.uidByte[i], HEX);
    }
    uidStr.toUpperCase();

    Serial.print("RFID=");
    Serial.println(uidStr);

    mfrc522.PICC_HaltA();
    waitForRFID = false;
  }
}

void checkRFIDTimeout() {
  unsigned long elapsed = millis() - waitStartMillis;
  if (elapsed >= RFID_TIMEOUT) {
    waitForRFID = false;
    showStatus("RFID Timeout");
    delay(2000);
    showStatus("DzTollReady");
  }
}

void loop() {
  updateOutputs();
  handleSerialCommands();

  if (waitForRFID) {
    handleRFID();
    checkRFIDTimeout();
  }
}
