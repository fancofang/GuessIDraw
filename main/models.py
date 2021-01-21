import hashlib
from datetime import datetime
from flask_login import UserMixin
from sqlalchemy.orm import validates
from werkzeug.security import generate_password_hash, check_password_hash
from main.extensions import db
from sqlalchemy import event

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(254), unique=True, nullable=False)
    nickname = db.Column(db.String(30),unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    email_hash = db.Column(db.String(128))
    messages = db.relationship('Message', backref='user')
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'))
    register = db.Column(db.DateTime, default=datetime.utcnow())
    lastroom = db.Column(db.String(128))

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        self.generate_email_hash()


    def set_password(self,password):
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)

    def generate_email_hash(self):
        if self.email is not None and self.email_hash is None:
            self.email_hash = hashlib.md5(self.email.encode('utf-8')).hexdigest()  # encode for py23 compatible

    @property
    def gravatar(self):
        return 'https://gravatar.com/avatar/%s?d=robohash' % self.email_hash

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    body = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow())
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'))


class Room(db.Model):
    __tablename__ = 'rooms'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(30), unique=True, nullable=False)
    password = db.Column(db.String(128))
    leader = db.Column(db.String(30), default='Fanco')
    users = db.relationship('User', backref='room')
    messages = db.relationship('Message', backref='room', cascade='all')

    def set_leader(self,name):
        self.leader = name
        return self.leader

    @validates('users')
    def validate_users_size(self, key, target):
        # print("validates:",self,key, target)
        # print("The room's members:",self.users)
        assert len(self.users) <= 5
        return target


class Word(db.Model):
    __tablename__ = 'words'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    category = db.Column(db.String(128), default='Other')





# @event.listens_for(Room, 'before_insert')
# def receive_before_insert(mapper, connection, target):
#     print('before_insert:',mapper, connection, target)
#     print(target.users)
#
#
# @event.listens_for(Room, 'before_update')
# def receive_before_update(mapper, connection, target):
#     "listen for the 'before_update' event"
#     print('before_update:',mapper, connection, target)
#
#     print(target.users)
#
#
#
# @event.listens_for(Room.users, 'append',)
# def receive_append2(target,value, initiator):
#     print("房间增加用户：",target,value, initiator)

# class ListRoomMerber(object):
#     def __init__(self):
#         self.data = []
#     def append(self,item):
#         if len(self.data) < 2:
#             self.data.append(item)
#         else:
#             raise Exception("Out of space")
#     def remove(self,item):
#         self.data.remove(item)
#
#     def extend(self, items):
#         self.data.extend(items)
#
#     def __iter__(self):
#         return iter(self.data)