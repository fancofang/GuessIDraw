from flask import render_template, session
from flask_socketio import send, emit, join_room, leave_room, rooms
from flask_login import current_user
from main.extensions import socketio, db, redis
from main.models import User, Message, Room


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
    
@socketio.event
def leave(message):
    print(current_user.nickname + message.data + message.room)
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
    
@socketio.event
def ready(message):
    room = message['room']
    redis.hset(room, current_user.nickname, 1)
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


@socketio.event
def reset(message):
    room = message['room']
    r = Room.query.filter_by(name=room).first()
    reset_status = {user.nickname:0 for user in r.users}
    print(reset_status)
    redis.hmset(room, reset_status)
    emit('my_response',
         {
             'type': 'reset',
             'data': 'all done'
         },
         room=message['room'])
    

@socketio.event
def activeCountdown(message):
    print("receive count down command")
    emit('my_response',
         {
             'type': 'countdown',
             'data': 'begin to count down',
         },
         room=message['room'])


@socketio.event
def stopDraw(message):
    room = message['room']
    redis.hset("roomstatus", room, 0)
    emit('my_response',
         {
             'type': 'endRound',
             'data': message['data'],
             'user': message['user']
         },
         room=message['room'])


@socketio.event()
def inform(message):
    print(message['data'])
    emit('my_response',
         {
             'type': 'inform',
             'data': message['data'],
         },
         room=message['room'],
         include_self=False)


@socketio.event()
def mousemove(message):
    emit('draw',
         {
             'data': message['data'],
         },
         room=message['room'],
         include_self=False)


@socketio.on('answertime')
def beginanswer(data):
    room = session.get('room')
    emit('answerprocess',data,room=room)



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
