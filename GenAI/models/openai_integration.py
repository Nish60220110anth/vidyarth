from models.read_document import ReadDocument
from config import vidyarth_dbconfig, openaiconfig, folder
import os
import mysql.connector
from openai import OpenAI
from flask import make_response, jsonify
import json
import logging

logger = logging.getLogger(__name__) 


class OpenAi:

    def __init__(self):
        self.read_document = ReadDocument()
        self.model = openaiconfig["model"]
        self.openai_api_key = openaiconfig["api_key"]
        self.connection = mysql.connector.connect(host=vidyarth_dbconfig['host'],user=vidyarth_dbconfig['user'],password=vidyarth_dbconfig['password'],database=vidyarth_dbconfig['database'])
        self.connection.autocommit=True
        self.cursor = self.connection.cursor(dictionary=True)
        self.company_folder = folder

    
    def set_context(self, data):

        company_id = data.get("companyId")
        context = self.read_documents(company_id)
        # read the file from fire base
        context += "Job description: \n"
        context += self.read_document.read_webfile(data.get("jdLinks"))
        context += "Compendium: \n"
        context += self.read_document.read_webfile(data.get("compendiumLinks"))

        prompt = (
            f"I am a MBA student at IIM Lucknow a premier business school in India. "
            f"I am preparing for the placements at {data.get("fullName")}, "
            "Generate a summary of the company only based on the inputs provided. The inputs i provide entail overview of the company, job description offered, past interview compendium"
            "The summary should contain a brief overview of the company, roles it offers, compensation or CTC if provided in job description, and the content provided in interview compendium"
            f"\nDocuments: {context}"
            )

        
        messages = [{
            "role": "system",
            "content": prompt
            }]
        
        summary = self.openai_client(messages)
        logger.info(f"Open API company summary respone  for company: {data.get("fullName")} is \n{summary}\n")
        messages.append({"role": "assistant", "content": summary})
        
        return summary

    def answer_query(self, data):
        
        user_id = data.get('userId')
        company_id = data.get('companyId')
        question = data.get('question')
        
        if data['isCvHr']:
            return self.cv_hr_interview(data)

        document = ""
        chat_history = []
        if data['isInit']:
            logger.info(f"Creating new session for user id: {user_id}")
            context = self.read_documents(company_id)
            context += "Job description: \n"
            context += self.read_document.read_webfile(data.get("jdLinks"))
            context += "Compendium: \n"
            context += self.read_document.read_webfile(data.get("compendiumLinks"))
            query = """
                    REPLACE INTO user_sessions (user_id, is_cvhr, document, chat_history)
                    VALUES (%s, %s, %s, %s)
                """
            self.cursor.execute(query, (user_id, 0, context, json.dumps([])))
            logger.info(f"Sesson initialized for user: {user_id}")
            document += context
        else:
            logger.info("Session alradedy created continuing the dialogue")
            query = """
                    SELECT document, chat_history FROM user_sessions
                     WHERE user_id = %s AND is_cvhr = %s
                  """
            self.cursor.execute(query, (user_id, False))
            session = self.cursor.fetchone()
            document += session['document']
            chat_history += json.loads(session['chat_history'])
        
        prompt = (
            f"I am a MBA student at IIM Lucknow a premier business school in India. "
            f"I am preparing for the summer internship at company {data['companyName']}, "
            "Simulate an In interview based on the documents provided give the question or situation where I will respond and then you will ask further questions"
            f"\nDocuments: {document}"
            )
        
        messages = [{"role": "system", "content": prompt}]
        messages.extend(chat_history)
        if not data['isInit']:
            logger.info(f"Continuing the chat next question {question}")
            messages.append({"role": "user", "content": question})

        answer = self.openai_client(messages)
        logger.info(f"Open AI API response for user: {user_id} \n {answer}")
        chat_history.append({"role": "user", "content": question})
        chat_history.append({"role": "assistant", "content": answer})

        json_dump = json.dumps(chat_history, ensure_ascii=False)

        sql = "UPDATE user_sessions SET chat_history = %s WHERE user_id = %s AND is_cvhr = %s"
        self.cursor.execute(sql, (json_dump, user_id, False))
        if self.cursor.rowcount == 0:
            logger.error("Session update failed")
        
        return answer

    
    def reset_session(self, user_id):
        self.cursor.execute(f"DELETE FROM user_sessions WHERE user_id = '{user_id}'")
        return jsonify({"message": "Session reset successfully."})

    
    def openai_client(self, messages):

        summary = ""

        try:
            client = OpenAI(api_key=self.openai_api_key)
            response = client.chat.completions.create(
                    model=self.model,
                    messages = messages
                    )
            summary += response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Error connecting to OpenAI API call: {str(e)}")
        
        return summary
  
    
    def read_documents(self, company_id):

        text = ""
        filename = company_id + ".txt"
        for key in self.company_folder:
            logger.info(f"Reading from folder: {key}")
            path = os.path.join(self.company_folder[key].strip(), filename)
            if not path or not os.path.exists(path):
                logger.error(f"File for company id : {company_id}, '{path}' not found.")
                continue
            logger.info(f"reading all document: {path}")
            text += "Company" + key + "\n"
            text += self.read_document.read_file(path)
            logger.info(f"document content: {text}")
        
        return text

    def cv_hr_interview(self, data):
         
        user_id = data.get('userId')
        question = data.get('question')

        document = ""
        chat_history = []
        if data['isInit']:
            logger.info(f"Creating new session for user id: {user_id}")
            document += self.read_document.read_pdf(data['cvPath'])
            query = """
                    REPLACE INTO user_sessions (user_id, is_cvhr, document, chat_history)
                    VALUES (%s, %s, %s, %s)
                """
            self.cursor.execute(query, (user_id, 1, document, json.dumps([])))
            logger.info(f"Sesson initialized for user for CV HR: {user_id}")
        else:
            logger.info("Session alradedy created continuing the dialogue")
            query = """
                    SELECT document, chat_history FROM user_sessions
                     WHERE user_id = %s AND is_cvhr = %s
                  """
            self.cursor.execute(query, (user_id, True))
            session = self.cursor.fetchone()
            document += session['document']
            chat_history += json.loads(session['chat_history'])
        
        prompt = (
            f"I am a MBA student at IIM Lucknow a premier business school in India. "
            f"I am preparing for the CV HR interview"
            "Simulate an In interview based on the CV provided give the question or situation where I will respond and then you will ask further questions"
            f"\nDocuments: {document}"
            )
        
        messages = [{"role": "system", "content": prompt}]
        messages.extend(chat_history)
        if not data['isInit']:
            logger.info(f"Continuing the chat next question {question}")
            messages.append({"role": "user", "content": question})

        answer = self.openai_client(messages)
        logger.info(f"Open AI API response for user: {user_id} \n {answer}")
        chat_history.append({"role": "user", "content": question})
        chat_history.append({"role": "assistant", "content": answer})

        json_dump = json.dumps(chat_history, ensure_ascii=False)

        sql = "UPDATE user_sessions SET chat_history = %s WHERE user_id = %s AND is_cvhr = %s"
        self.cursor.execute(sql, (json_dump, user_id, True))
        if self.cursor.rowcount == 0:
            logger.error("Session update failed")
        
        return answer




