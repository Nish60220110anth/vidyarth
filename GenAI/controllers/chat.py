import flask
from app import app
from flask import request, send_file
from models.openai_integration import OpenAi
from models.authenticate import Authenticate
import logging
import markdown

logger = logging.getLogger(__name__)

open_ai = OpenAi()
auth = Authenticate()

@app.route("/company/summary", methods=["POST"])
#@auth.token_auth()
def summary():
    logger.info(f"Request domain: {request.remote_addr}")
    if request.remote_addr not in ("127.0.0.1", "::1"):
        logger.warning(f"Unauthorized IP: {request.remote_addr}")
        abort(403, description="Access denied. Only localhost allowed.")

    data = request.get_json(force=True)
    logger.info(f"Request payload {data}")
    return open_ai.set_context(data)

@app.route("/answer/query", methods=["POST"])
#@auth.token_auth()
def answer_query():
    data = request.get_json(force=True)
    logger.info(f"Request payload {data}")
    return markdown.markdown(open_ai.answer_query(data))