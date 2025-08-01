@echo off
cd C:\Users\PC\Desktop\Systems\vidyarth\GenAI
call vidyarth\Scripts\activate.bat
pip install --no-cache-dir -r requirements.txt
set FLASK_ENV=development 
python -m models.news_scraper
