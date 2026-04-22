import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for the dashboard origin
CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Target phone number as requested
TARGET_PHONE = "+91993093165"

# Initialize Twilio Client conditionally
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_FROM_NUMBER = os.getenv('TWILIO_FROM_NUMBER')

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("📱 Twilio Client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Twilio Client: {e}")
else:
    logger.warning("⚠️ Twilio credentials missing in .env. Falling back to MOCK SMS mode.")

@app.route('/api/notify', methods=['POST'])
def notify_alert():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    alert_type = data.get('type', 'Unknown')
    location = data.get('location', 'Unknown Location')
    
    # Format the message
    sms_body = (
        f"[EVAC-OS EMERGENCY]\n"
        f"Sensor trigger approved at: {location}\n"
        f"Type: {alert_type}\n"
        f"Rescue team has been alerted! Please stand by."
    )

    result = {"status": "success", "mode": "mock", "message": sms_body}

    if twilio_client:
        try:
            message = twilio_client.messages.create(
                body=sms_body,
                from_=TWILIO_FROM_NUMBER,
                to=TARGET_PHONE
            )
            logger.info(f"🚀 SMS Dispatched! Message SID: {message.sid}")
            result["mode"] = "live"
            result["sid"] = message.sid
        except TwilioRestException as e:
            logger.error(f"❌ Twilio Error: {e}")
            result["status"] = "error"
            result["error"] = str(e)
            return jsonify(result), 500
        except Exception as e:
            logger.error(f"❌ Unexpected Error: {e}")
            result["status"] = "error"
            result["error"] = str(e)
            return jsonify(result), 500
    else:
        logger.info(f"📞 [MOCK SMS to {TARGET_PHONE}]:\n{sms_body}")

    return jsonify(result), 200

if __name__ == '__main__':
    logger.info("Starting EVAC-OS Python backend...")
    app.run(host='0.0.0.0', port=5000, debug=True)
