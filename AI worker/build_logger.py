import logging
from datetime import datetime
import os


LOG_DIR= "log"
os.makedirs(LOG_DIR, exist_ok= True)

log_file= os.path.join(LOG_DIR, f"experiemnt_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

logging.basicConfig(level= logging.INFO, format= "%(asctime)s | %(levelname)s | %(message)s", handlers= [logging.FileHandler(log_file), logging.StreamHandler()])

def get_logger(name: str):
    return logging.getLogger(name)