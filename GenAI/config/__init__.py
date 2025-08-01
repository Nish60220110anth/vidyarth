import os

env = os.getenv('FLASK_ENV', 'development')

if env == 'production':
    from .production_config import vidyarth_dbconfig, openaiconfig, folder, gnews, news_domain
else:
    from .development_config import vidyarth_dbconfig, openaiconfig, folder, gnews, news_domain