from datetime import datetime, timedelta
from logging import exception
import mysql.connector
import jwt
from flask import make_response, request, json
import re
from config import vidyarth_dbconfig
from functools import wraps
import logging

logger = logging.getLogger(__name__)  # Uses app.py config


class Authenticate():
    
    def __init__(self):
        self.connection = mysql.connector.connect(host=vidyarth_dbconfig['host'],user=vidyarth_dbconfig['user'],password=vidyarth_dbconfig['password'],database=vidyarth_dbconfig['database'])
        self.connection.autocommit=True
        self.cursor = self.connection.cursor(dictionary=True)

    def user_login(self, username):
        logger.info(f"Authentication request user id: {username}")
        self.cursor.execute(f"SELECT id, email, name FROM users WHERE email='{username}'")
        result = self.cursor.fetchall()
        if len(result)==1:
            exptime = datetime.now() + timedelta(minutes=15)
            exp_epoc_time = exptime.timestamp()
            data = {
                "payload":result[0],
                "exp":int(exp_epoc_time)
            }
            
            jwt_token = jwt.encode(data, "Sagar@123", algorithm="HS256")
            return make_response({"token":jwt_token}, 200)
        else:
            return make_response({"message":"NO SUCH USER"}, 204)
        
    def token_auth(self):
        def inner1(func):
            @wraps(func)
            def inner2(*args, **kwargs):
                try:
                    authorization = request.headers.get("authorization")
                    if re.match("^Bearer *([^ ]+) *$", authorization, flags=0):
                        token = authorization.split(" ")[1]
                        try:
                            tokendata = jwt.decode(token, "Sagar@123", algorithms=["HS256"])
                        except Exception as e:
                            logger.error(f"Error decoding token {str(e)}")
                            return make_response({"ERROR":str(e)}, 401)
                        logger.info(f"token  {tokendata}")
                        user_id = tokendata['payload']['id']
                        self.cursor.execute(f"SELECT id, email, name from users WHERE id='{user_id}'")
                        result = self.cursor.fetchall()
                        if len(result) == 1:
                            return func(*args, **kwargs)
                        else:
                            return make_response({"ERROR":"INVALID_ROLE"}, 422)
                    else:
                        return make_response({"ERROR":"INVALID_TOKEN"}, 401)
                except Exception as e:
                    logger.error(f"Error {str(e)}")
                    return make_response({"ERROR":str(e)}, 401)
            return inner2
        return inner1

    