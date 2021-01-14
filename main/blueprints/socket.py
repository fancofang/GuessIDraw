
from flask import Blueprint, render_template, session
from flask_socketio import send, emit, join_room, leave_room, rooms
from flask_login import current_user
from main.extensions import socketio, db, redis
from main.models import User, Message, Room
from datetime import datetime


online_users = {}

@socketio.event
def send_message(message):
    print("server receive message",message)
    room = message['room']
    db_room = Room.query.filter_by(name=room).first()
    save_message = Message(body=message['data'], user=current_user,room=db_room)
    db.session.add(save_message)
    db.session.commit()
    emit('new_message',
        {
            'type': 'message',
            'message_html':render_template('chat/_new_message.html', message=save_message),
            'message_body': message['data'],
            'gravatar': current_user.gravatar,
            'nickname': current_user.nickname,
            'user_id': current_user.id
            },
        room=message['room'])

#Client connect to server
@socketio.event
def join(message):
    join_room(message['room'])
    emit('my_response',
         {
             'type': 'join',
             'message_html': render_template('chat/_join_leave_message.html', user=current_user.nickname,
                                             message='join in the room'),
             'data': 'join in the room',
             'user': current_user.nickname
         },
         room=message['room'])
    # global online_users
    # room = session.get('room')
    # r = Room.query.filter_by(name=room).first()
    # join_room(room)
    # if room not in online_users:
    #     online_users[room]=[]
    # if current_user.nickname not in online_users[room]:
    #     online_users[room].append(current_user.nickname)
    # emit('confirmjoin',
    #     {
    #     'user_html': render_template('chat/_user_image.html',user=current_user, leader=r.leader),
    #     'message': current_user.nickname + ' enter the room.',
    #     'user_name': current_user.nickname
    #     },
    #     room=room)
    
@socketio.event
def leave(message):
    print(rooms())
    print(message['data'])
    room = message['room']
    emit('my_response',
         {
             'type': 'leave',
             'message_html': render_template('chat/_join_leave_message.html', user=current_user.nickname,
                                             message='has left the room'),
             'data': 'has left the room',
             'user': current_user.nickname
         },
         room=room)
    leave_room(room)
    
# @socketio.on('leave')
# def on_leave(data):
#     global online_users
#     room = session.get('room')
#     online_users[room].remove(current_user.nickname)
#     emit('confirmleave',
#          {
#              'message': current_user.nickname + ' has left the room',
#              'user_name': current_user.nickname,
#              'user_id':current_user.id
#          },
#          room=room)
#     leave_room(room)


@socketio.on('mousemove')
def senddraw(drawdata):
    room = session.get('room')
    emit('draw',drawdata,room=room, include_self=False)


@socketio.on('answertime')
def beginanswer(data):
    room = session.get('room')
    emit('answerprocess',data,room=room)


@socketio.event
def ready(message):
    room = message['room']
    redis.hset(room, current_user.nickname, 1)
    # emit('ready',
    #     {
    #         'user_name': current_user.nickname
    #     },
    #     room=room)
    emit('my_response',
         {
             'type': 'ready',
             'data': 'is ready',
             'user': current_user.nickname
         },
         room=message['room'])

@socketio.event
def cancel(message):
    room = message['room']
    redis.hset(room, current_user.nickname, 0)
    emit('my_response',
         {
             'type': 'cancel',
             'data': 'is not ready',
             'user': current_user.nickname
         },
         room=message['room'])
    # emit('cancel',
    #     {
    #         'user_name': current_user.nickname
    #     },
    #     room=room)

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