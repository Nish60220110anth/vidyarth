import os 
import logging
from logging.handlers import TimedRotatingFileHandler
from flask import Flask 
app = Flask(__name__)

log_folder = "logs"
os.makedirs(log_folder, exist_ok=True)

log_file = os.path.join(log_folder, "app.log")

handler = TimedRotatingFileHandler(log_file, when="midnight", interval=1)
handler.suffix = "%Y-%m-%d"
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")
handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(handler)

logger = logging.getLogger(__name__)
logger.info(f"Running in {os.getenv('FLASK_ENV', 'development')} mode")

@app.route("/health")
def health():
   return "ping"

from controllers import *

# implemnt cron
# create bat file