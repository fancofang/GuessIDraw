from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_moment import Moment
from flask_redis import FlaskRedis

db = SQLAlchemy()
socketio = SocketIO()
login_manager = LoginManager()
csrf = CSRFProtect()
moment = Moment()
redis = FlaskRedis()

@login_manager.user_loader
def load_user(user_id):
    from main.models import User
    return User.query.get(int(user_id))