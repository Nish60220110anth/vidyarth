import os
from openai import OpenAI
import PyPDF2
from docx import Document
import logging
import requests
from io import BytesIO

logger = logging.getLogger(__name__)

class ReadDocument:

    def __init__(self):
        pass
    
    def read_pdf(self, file_stream):
        text = ""
        reader = PyPDF2.PdfReader(file_stream)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        logger.info("Read PDF file from stream")
        return text


    def read_docx(self, file_stream):
        document = Document(file_stream)
        text = "\n".join([para.text for para in document.paragraphs])
        logger.info("Read DOCX file from stream")
        return text
    
    def read_documents(self, folder_path):
        combined_text = ""
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            logger.info(f"Reading file {file_path}")
            
            if filename.endswith(".txt"):
                with open(file_path, 'r', encoding='utf-8') as f:
                    combined_text += f.read() + "\n"
        
            elif filename.endswith(".pdf"):
                with open(file_path, 'rb') as f:
                    combined_text += self.read_pdf(f) + "\n"
        
            elif filename.endswith(".docx"):
                with open(file_path, 'rb') as f:
                    combined_text += self.read_docx(f) + "\n"
        logger.info(f"combined text to set context: {combined_text}")
        return combined_text

    def read_file(self, file_path):

        combined_text = ""
        with open(file_path, 'r', encoding='utf-8') as f:
                combined_text += f.read() + "\n"

        return combined_text

    def read_webfile(self, urls):
        text = ""
    
        for url in urls:
            response = requests.get(url)
            if response.status_code == 200:
                logger.info(f"Request successful for url {url}")
                content_type = response.headers.get('Content-Type', '').lower()
                logger.info(f"Detected Content-Type: {content_type}")
                file_stream = BytesIO(response.content)
                if 'application/pdf' in content_type:
                    text += self.read_pdf(file_stream)
                    logger.info(f"Read PDF file form web {text}")
                elif 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type:
                    text += self.read_docx(file_stream)
                    logger.info(f"Read doc file form web {text}")
                elif 'text/plain' in content_type:
                    text +=file_stream.read().decode('utf-8')
                else:
                    logger.error("Unsupported file type.")
            else:
                logger.error("Error fetching news")
        logger.info(f"Firebase context text {text}")
        return text
                

