import flask
from app import app
from flask import request, send_file
from models.news_integration import News
from models.authenticate import Authenticate

news = News()
auth = Authenticate()

@app.route("/news/headline", methods=["GET"])
@auth.token_auth()
def headline():
    return news.get_headlines()

@app.route("/news/<query>", methods=["GET"])
@auth.token_auth()
def get_news(query):
    return news.get_news(query)