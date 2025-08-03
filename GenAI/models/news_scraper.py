from app import app
from config import vidyarth_dbconfig
from models.news_integration import News
import mysql.connector
import logging
import os

logger = logging.getLogger(__name__)

class NewsScraper:

    def __init__(self):
        self.connection = mysql.connector.connect(host=vidyarth_dbconfig['host'],user=vidyarth_dbconfig['user'],password=vidyarth_dbconfig['password'],database=vidyarth_dbconfig['database'])
        self.connection.autocommit=True
        self.cursor = self.connection.cursor(dictionary=True)
        self.news = News()

    def scrap_headlines(self):

        self.news.get_headlines()

    def scrap_news(self):
        self.cursor.execute("SELECT id, company_full FROM company")
        results = self.cursor.fetchall()
        company_names = [[row["id"], row["company_full"]] for row in results]
        logger.info(f"List of companies to scrap the news for {company_names}")
        for name in company_names[:5]:
            logger.info(f"Fetching the news of {name}")
            self.news.get_news(name)


def main():
    logger.info(f"Environment of the news scraper {os.environ.get("FLASK_ENV")}")
    logger.info("News Scrapping is running")
    news_scraper = NewsScraper()
    logger.info("Scraping headlines")
    news_scraper.scrap_headlines()
    logger.info("Scraping news of companies")
    news_scraper.scrap_news()


if __name__ == "__main__":
    main()
