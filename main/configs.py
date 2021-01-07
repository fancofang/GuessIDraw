import os
import sys

basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

WIN =sys.platform.startswith('win')
if WIN:
    prefix ='sqlite:///'
else:
    prefix = 'sqlite:////'

class Baseconfig:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Baseconfig):
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', prefix + os.path.join(basedir, 'data.db'))


class ProductionConfig(Baseconfig):
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', prefix + os.path.join(basedir, 'data.db'))

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig
}
