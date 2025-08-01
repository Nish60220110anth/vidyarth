@echo off
cd C:\Users\PC\Desktop\Systems\vidyarth\GenAI
python -m venv vidyarth
call GenAI\Scripts\activate.bat
pip install --no-cache-dir -r requirements.txt
set FLASK_ENV=development 
flask run