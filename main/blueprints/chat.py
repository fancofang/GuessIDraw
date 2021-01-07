import random
from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from flask_login import current_user
from main.extensions import db, redis
from main.models import User, Message, Room, Word


chat_bp = Blueprint('chat',__name__)

topic = {}

@chat_bp.route('/')
def index():
    # room_name = session.get('room')
    # room = Room.query.filter_by(name=room_name).first()
    # if room is not None:
    #     return redirect(url_for('chat.join_room', rid=room.id))
    # session.pop(room_name, None)
    return render_template('index.html')

@chat_bp.route('/room')
def room():
    room_name = session.get('room')
    room = Room.query.filter_by(name=room_name).first()
    messages = Message.query.filter_by(room=room).order_by(Message.timestamp.asc())[-30:]
    rank = redis.zrevrange(room_name,0,-1,withscores=True,score_cast_func=int)
    rank = dict(rank)
    return render_template('chat/home.html', messages=messages, user=current_user, room_name=room_name,
                           users=room.users,leader=room.leader, rank=rank)

@chat_bp.route('/create',  methods=['GET', 'POST'])
def create_room():
    name = request.form['name']
    room = Room.query.filter_by(name=name).first()
    if room is None:
        new = Room(name=name)
        new.set_leader(current_user.nickname)
        db.session.add(new)
        db.session.commit()
        room = Room.query.filter_by(name=name).first()
        room.users.append(current_user)
        db.session.commit()
        redis.zadd(name,{current_user.nickname:0})
        return redirect(url_for('chat.join_room', rid=new.id))
    flash('Sorry, The name is already exist.')
    return redirect(url_for('chat.index'))

@chat_bp.route('/search',  methods=['GET', 'POST'])
def search_room():
    name = request.form['room']
    room = Room.query.filter_by(name=name).first()
    if room is not None:
        return redirect(url_for('chat.join_room', rid=room.id))
    flash('Sorry, the room doesn`t exist.')
    return redirect(url_for('chat.index'))

@chat_bp.route('/room/<int:rid>')
def join_room(rid):
    room = Room.query.filter_by(id=rid).first()
    count = len(room.users)
    if redis.sismember('ongame', room.name) == 1:
        flash('The room is on the game,please join it later.')
        return redirect(url_for('chat.index'))
    if (current_user not in room.users) and count >= 6:
        flash('Sorry, The room is already full.')
        return redirect(url_for('chat.index'))
    if current_user not in room.users:
        room.users.append(current_user)
        db.session.commit()
        a = redis.zadd(room.name, {current_user.nickname: 0})
    session['room'] = room.name
    return redirect(url_for('chat.room'))

@chat_bp.route('/leave')
def leave_room():
    name = session.get('room')
    room = Room.query.filter_by(name=name).first()
    try:
        user = User.query.filter_by(id=current_user.id ).first()
    except:
        user = User.query.filter_by(id=session.get('id')).first()
    finally:
        room.users.remove(user)
        db.session.commit()
        session.pop('room', None)
        redis.zrem(name, user.nickname)
        count = len(room.users)
        if count == 0 :
            db.session.delete(room)
            db.session.commit()
            redis.delete(name)
        return redirect(url_for('chat.index'))

@chat_bp.route('/leader')
def changeleader():
    roomname = session.get('room')
    room = Room.query.filter_by(name=roomname).first()
    count = len(room.users)
    if count <= 1:
        return ""
    else:
        resultList = [ele for ele in room.users if ele != current_user]
        leader = resultList[0].nickname
        room.set_leader(leader)
        db.session.commit()
    return room.leader

@chat_bp.route('/messages')
def get_messages():
    page = request.args.get('page', 1, type=int)
    pagination = Message.query.filter_by(room=room).order_by(Message.timestamp.desc()).paginate(
        page, per_page=30)
    messages = pagination.items
    return render_template('chat/_messages.html', messages=messages[::-1])

@chat_bp.route('/checkanswer')
def check_answer():
    roomname = session.get('room')
    answer = request.args.get('answer')
    if answer.lower() == topic[roomname].lower():
        redis.zincrby(roomname, 10, current_user.nickname)
        return "right"
    return "wrong"


@chat_bp.route('/gettopic')
def get_topic():
    room = session.get('room')
    word = Word.query.get(random.randint(1, Word.query.count()))
    redis.sadd('ongame', room)
    topic[room]= word.name
    return topic[room]

@chat_bp.route('/cleantopic')
def clean_topic():
    room = session.get('room')
    redis.srem('ongame', room)
    del topic[room]
    return ""



@chat_bp.route('/test')
def test_page():
    return render_template('test.html')