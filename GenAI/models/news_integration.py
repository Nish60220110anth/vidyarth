from datetime import datetime, timedelta
import requests
import json
import os
import certifi
import time
from config import vidyarth_dbconfig, gnews, news_domain, openaiconfig
from flask import make_response, jsonify
import mysql.connector
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)

class News:

    def __init__(self):
        self.search_url = gnews["search_url"]
        self.headline_url = gnews["headline_url"]
        self.api_key = gnews["api_key"]
        self.news_domain = news_domain
        self.model = openaiconfig["model"]
        self.openai_api_key = openaiconfig["api_key"]
        self.start_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")

        self.connection = mysql.connector.connect(host=vidyarth_dbconfig['host'],user=vidyarth_dbconfig['user'],password=vidyarth_dbconfig['password'],database=vidyarth_dbconfig['database'])
        self.connection.autocommit=True
        self.cursor = self.connection.cursor(dictionary=True)
        self.news_category = gnews["category"]

    def get_headlines(self):
        headlines = []
        for category in self.news_category:
            logger.info(f"Fetching headlines of category: {category} ")
            headlines += self.get_headline(category)
            try:
                time.sleep(1)
            except Exception as e:
                logger.error(f"An error occurred during sleep: {e}")

        if headlines:
            query = """
            INSERT IGNORE INTO news (news_tag, title, content, link_to_source, image_url, created_at, subdomain_tag)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """

            values = []
            for headline in headlines:
                published_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                try:
                    published_at = datetime.strptime(headline['publishedAt'], "%Y-%m-%dT%H:%M:%SZ").strftime("%Y-%m-%d %H:%M:%S")
                except Exception as e:
                    logger.error(f"Date conversion failed for {headline['publishedAt']}: {e}")
                domain = self.classify_news_domain(headline['description'] + " " + headline['content'])
                values.append((headline['category'], headline['title'], headline['description'], headline['url'], headline['image'], published_at, domain))
            self.cursor.executemany(query, values)
        return headlines
        

    def get_headline(self, category):
        
        params = {
            "category": category,
            "lang": "en",
            "country": "in",
            "max": 10,
            "token": self.api_key
        }
        try:
            response = requests.get(self.headline_url, params=params, verify=certifi.where())
            articles = response.json().get("articles", [])
            return [{"category": category, "title": a["title"], "description": a["description"], "content": a["content"], "url": a["url"], "image": a["image"], "publishedAt": a["publishedAt"]} for a in articles]
        except Exception as e:
            logger.error(f"Error fetching news: {e}")
            return []
    
    def get_news(self, news_query):
        
        news = self.fetch_news(news_query[1])
        logger.info(f"fetching news of company: {news_query[1]}, id : {str(news_query[0])}")
        
        if news:
            query = """
            INSERT IGNORE INTO news (news_tag, title, content, link_to_source, image_url, created_at, subdomain_tag)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """

            values = []
            urls = []
            for n in news:
                published_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                try:
                    published_at = datetime.strptime(n['publishedAt'], "%Y-%m-%dT%H:%M:%SZ").strftime("%Y-%m-%d %H:%M:%S")
                except Exception as e:
                    logger.error(f"Date conversion failed for {n['publishedAt']}: {e}")
                logger.info(f"company id : {str(news_query[0])}")
                domain = self.classify_news_domain(n['description'] + " " + n['content'])
                values.append(('company', n['title'], n['description'], n['url'], n['image'], published_at, domain))
                urls.append(n['url'])
            self.cursor.executemany(query, values)
            placeholders = ','.join(['%s'] * len(urls))
            logging.info(f"Placholder {placeholders}")
            logging.info(f"Total URLs: {len(urls)} | URLs: {urls}")
            query = f"SELECT id FROM news WHERE link_to_source IN ({placeholders})"
            self.cursor.execute(query, tuple(urls))
            result = self.cursor.fetchall()
            ids = [row['id'] for row in result]
            logger.info(f"News ids: {ids}")
            query = "INSERT IGNORE  INTO news_company (news_id, company_id) VALUES(%s, %s)"
            query_values = [(id, news_query[0]) for id in ids]
            logger.info(f"Inserting company news mapping {query_values}")
            self.cursor.executemany(query, query_values)
            logging.info("Inseted company news mapping")
        
        return news

    def fetch_news(self, query):
        params = {
            "q": query,
            "lang": "en",
            "country": "in",
            "from": self.start_date,
            "max": 2,
            "token": self.api_key
        }
        try:
            response = requests.get(self.search_url, params=params, verify=certifi.where())
            logger.info(response)
            articles = response.json().get("articles", [])
            return [{"category": query, "title": a["title"], "description": a["description"], "content": a["content"], "url": a["url"], "image": a["image"], "publishedAt": a["publishedAt"]} for a in articles]
        except Exception as e:
            logger.error(f"Error fetching news: {e}")
            return []
    
    def download_image(self, url, image_id):
        folder = "image"
        image_id += ".jpg"
        os.makedirs(folder, exist_ok=True)
        file_path = os.path.join(folder, image_id)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Referer": "https://www.aljazeera.com/",
            "Accept-Language": "en-US,en;q=0.9"
            }


        try:
            response = requests.get(url, headers=headers, verify=certifi.where())
            response.raise_for_status()  # Check for HTTP errors

            content_type = response.headers.get('Content-Type', '')
            logger.info(f"Content-Type: {content_type}")

            if 'image' in content_type:
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                logger.info(f"Image saved to {file_path}")
            else:
                logger.info("Still received non-image content. Automated downloads may be blocked.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error downloading image: {e}")

    def classify_news_domain(self, news):

        prompt = (
            f"I am creating a news domain classifer to classify the news in one of the following domains {self.news_domain}"
            f"\n News: {news} \n Classify the news in only one category and return only the category name which is given earlier in the same capitalized format"
            )
        
        messages = [{
            "role": "system",
            "content": prompt
            }]

        domain = ""

        # try:
        #     client = OpenAI(api_key=self.openai_api_key)
        #     response = client.chat.completions.create(
        #             model=self.model,
        #             messages = messages
        #             )
        #     domain += response.choices[0].message.content.strip()
        # except Exception as e:
        #     logger.error(f"Error connecting to OpenAI API call: {str(e)}")
        
        return domain

