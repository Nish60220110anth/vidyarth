from app import app
from flask import request, send_file
from models.openai_integration import OpenAi
from models.authenticate import Authenticate

auth = Authenticate()

@app.route("/user/login", methods=["POST"])
def user_login():
    auth_data = request.form
    return auth.user_login(auth_data['username'])