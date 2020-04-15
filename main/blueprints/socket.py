
from flask import Blueprint, render_template, session
from flask_login import current_user
from flask_socketio import send, emit, join_room, leave_room
from flask_login import current_user
from main.extensions import socketio, db, redis
from main.models import User, Message, Room
from datetime import datetime


socket_bp = Blueprint('socket',__name__)

online_users = {}


@socketio.on('new message')
def new_message(message_body):
    room = session.get('room')
    db_room = Room.query.filter_by(name=room).first()
    message = Message(body=message_body, user=current_user,room=db_room)
    db.session.add(message)
    db.session.commit()
    nickname = current_user.nickname
    gravatar = current_user.gravatar
    timestamp = datetime.utcnow()
    room = session.get('room')
    emit(
        'new message',
        {
            'message_html':render_template('chat/_new_message.html',
                                           message=message_body,
                                            avatar=gravatar,
                                            nickname=nickname,
                                            time = timestamp
                                           ),
            'message_body':message_body,
            'user_id': current_user.id
            },
        room=room
    )

@socketio.on('joined')
def on_join(data):
    global online_users
    room = session.get('room')
    r = Room.query.filter_by(name=room).first()
    join_room(room)
    if room not in online_users:
        online_users[room]=[]
    if current_user.nickname not in online_users[room]:
        online_users[room].append(current_user.nickname)
    emit('confirmjoin',
        {
        'user_html': render_template('chat/_user_image.html',user=current_user, leader=r.leader),
        'message': current_user.nickname + ' enter the room.',
        'user_name': current_user.nickname
        },
        room=room)

@socketio.on('leave')
def on_leave(data):
    global online_users
    room = session.get('room')
    online_users[room].remove(current_user.nickname)
    emit('confirmleave',
         {
             'message': current_user.nickname + ' has left the room',
             'user_name': current_user.nickname,
             'user_id':current_user.id
         },
         room=room)
    leave_room(room)


@socketio.on('mousemove')
def senddraw(drawdata):
    room = session.get('room')
    emit('draw',drawdata,room=room, include_self=False)


@socketio.on('answertime')
def beginanswer(data):
    room = session.get('room')
    emit('answerprocess',data,room=room)

@socketio.on('ready')
def ready(data):
    room = session.get('room')
    emit('ready',
        {
            'user_name': current_user.nickname
        },
        room=room)

@socketio.on('cancel')
def cancel(data):
    room = session.get('room')
    emit('cancel',
        {
            'user_name': current_user.nickname
        },
        room=room)

@socketio.on('renew')
def changeleader(data):
    room = session.get('room')
    if data['person'] == None:
        pass
    else:
        emit('changeleader',
            {
                'message': "amazing",
                'leader': data['person'],
                'user_name': current_user.nickname
            },
            room=room)

@socketio.on('updatescore')
def updatescore(data):
    room = session.get('room')
    rank = redis.zrevrange(room, 0, -1, withscores=True)
    rank = dict(rank)
    emit('updatescore',rank,room=room)

@socketio.on('inform')
def inform(data):
    room = session.get('room')
    emit('inform',data,room=room, include_self=False)