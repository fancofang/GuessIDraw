import random
from flask import Blueprint, render_template, redirect, url_for, flash, request, session, current_app ,jsonify
from flask_login import current_user
from main.extensions import db, redis
from main.models import User, Message, Room, Word

chat_bp = Blueprint('chat',__name__)


# redis describtion
# There are serveral type use in redis
# Set type: the key is "room", value is stored each of room name;
# Zset type: the key is "room name" + "_score", which store the players in the room and their scores.
# Hash type: 3.1 the key is "roomstatus", the field is each of room name, the value is the room status, if 1 that
#    means it's on the game, else means off the game.
#    3.2 the key is each of room name, and the field is each of room member, the value is user's status, if 1 that
#    means he is ready, else means not. Default is 0.
#    3.3 the key is "topic", and the field is  each of room name. the value is the answer of the room.


@chat_bp.before_request
def before_request():
    if not current_user.is_authenticated:
        return current_app.login_manager.unauthorized()
    pass

@chat_bp.route('/platform')
def platform():
    rooms = Room.query.all()
    leaders = { room.leader for room in rooms}
    leader_dict = { name:User.query.filter_by(nickname=name).first().gravatar for name in leaders}
    return render_template('platform.html', rooms=rooms, leaders=leader_dict)


@chat_bp.route('/room/<string:rn>')
def room(rn):
    room = Room.query.filter_by(name=rn).first()
    if current_user not in room.users:
        flash('Sorry, you are not in the room')
        return redirect(url_for('chat.platform'))
    # print(room.name)
    messages = Message.query.filter_by(room=room).order_by(Message.timestamp.asc())[-30:]
    rank = redis.zrevrange(room.name + "_score",0,-1,withscores=True,score_cast_func=int)
    # print(rank)
    rank = dict(rank)
    return render_template('chat/home.html', messages=messages, user=current_user.nickname, room_name=room.name,
                           users=room.users,leader=room.leader, rank=rank)

@chat_bp.route('/create',  methods=['GET', 'POST'])
def create_room():
    name = request.form['name']
    password = request.form['pass']
    room = Room.query.filter_by(name=name).first()
    if room is None and not redis.sismember("room",name):
        new_room = Room(name=name, password=password)
        new_room.set_leader(current_user.nickname)
        db.session.add(new_room)
        db.session.commit()
        # add room name to the name of room in redis set
        redis.sadd("room",name)
        room = Room.query.filter_by(name=name).first()
        room.users.append(current_user)
        db.session.commit()
        redis.zadd(name + "_score",{current_user.nickname:0})
        redis.hset(room.name, current_user.nickname, 0)
        return jsonify(result="success", type="create", data={"room":new_room.name, "room_url":url_for('chat.room', rn=room.name)})
        # return redirect(url_for('chat.join_room', rn=new_room.name))
    return jsonify(result="fail", type="create", message='Sorry, the name is alreay existed, please change another.')

@chat_bp.route('/search',  methods=['POST'])
def search_room():
    print("in search_room")
    name = request.form['room']
    room = Room.query.filter_by(name=name).first()
    if room is not None:
        return jsonify(result="success",type="search", data={'room':room.name, 'is_public': True if room.password else False, 'join_url':url_for('chat.join_room', rn=room.name)})
    return jsonify(result="fail",type="search", message='Can\'t find the room.')


@chat_bp.route('/join/<string:rn>', methods=['POST'])
def join_room(rn):
    room = Room.query.filter_by(name=rn).first()
    if room is None:
        return jsonify(result="fail",type="joinRoom", message="The room doesn't exist.")
    if room.password:
        password = request.form.get("password",None)
        if password != room.password:
            return jsonify(result="fail", type="joinRoom", message="Password is incorrect.")
    if redis.hget("roomstatus", room.name) == "1":
        return jsonify(result="fail", type="joinRoom", message="The room is on the game, please join later.")
    elif (current_user not in room.users) and len(room.users) >= 6:
        return jsonify(result="fail", type="joinRoom", message="Sorry, the room is already full.")
    elif current_user in room.users:
        return jsonify(result="success", type="joinRoom", data={"room": room.name,"room_url": url_for('chat.room', rn=room.name)})
    try:
        room.users.append(current_user)
        db.session.commit()
    except:
        return jsonify(result="fail", type="joinRoom", dmessage="Sorry, the room is already full.")
    redis.zadd(room.name + "_score", {current_user.nickname: 0})
    redis.hset(room.name, current_user.nickname, 0)
    return jsonify(result="success", type="joinRoom",
                   data={"room": room.name, "room_url": url_for('chat.room', rn=room.name)})

@chat_bp.route('/leave/<string:rn>')
def leave_room(rn):
    print(current_user.nickname, "run leave room command")
    room = Room.query.filter_by(name=rn).first()
    if room is not None and current_user in room.users:
        redis.zrem(room.name + "_score", current_user.nickname)
        redis.hdel(room.name, current_user.nickname)
        room.users.remove(current_user)
        if len(room.users) == 0 :
            print("clear the room", room.name)
            redis.srem("room",room.name)
            db.session.delete(room)
        db.session.commit()
    return redirect(url_for('chat.platform'))


@chat_bp.route('/room/<rn>/leader', defaults={'user':None})
@chat_bp.route('/room/<rn>/leader/<user>')
def leader_change(rn,user):
    room = Room.query.filter_by(name=rn).first()
    members = [i.nickname for i in room.users]
    print("in leader change function:",members,room.leader)
    if user and user in members:
        candidate = user
        # leader = room.set_leader(user)
    elif len(members) == 1 and members[0] == room.leader:
        return jsonify(result="success", type="changeLeader", data={"room": room.name, "leader": room.leader})
    else:
        candidate = random.choice([i for i in members if i !=room.leader])
    leader = room.set_leader(candidate)
    db.session.commit()
    print("new leader is ", leader)
    return jsonify(result="success", type="changeLeader", data={"room": room.name, "leader":leader})


@chat_bp.route('/messages/<string:rn>')
def get_messages(rn):
    page = request.args.get('page', 1, type=int)
    room = Room.query.filter_by(name=rn).first()
    pagination = Message.query.filter_by(room=room).order_by(Message.timestamp.desc()).paginate(
        page, per_page=30 ,error_out=False)
    messages = pagination.items
    return render_template('chat/_messages.html', messages=messages[::-1])


@chat_bp.route('/checkanswer/<string:rn>')
def check_answer(rn):
    answer = request.args.get('answer')
    print("check answer:",answer)
    room = Room.query.filter_by(name=rn).first()
    if redis.hget("roomstatus", room.name) == "1":
        correct_answer = redis.hget("topic", room.name)
        if answer.lower() == correct_answer.lower():
            redis.zincrby(room.name + "_score", 10, current_user.nickname)
            score = redis.zscore(room.name + "_score", current_user.nickname)
            return jsonify(result="correct", score=score, room=room.name, user=current_user.nickname)
    return jsonify(result="wrong", room=room.name)


@chat_bp.route('/gettopic/<string:rn>')
def get_topic(rn):
    room = Room.query.filter_by(name=rn).first()
    if current_user.nickname == room.leader:
        word = Word.query.get(random.randint(1, Word.query.count()))
        print(word)
        redis.hset("roomstatus", room.name, 1)
        redis.hset("topic", room.name, word.name)
        print("get topic:",word.name)
        return jsonify(result="success", topic=word.name, room=room.name)
    return jsonify(result="fail", topic=None, room=room.name)


@chat_bp.route('/room/<string:rn>/refreshscores')
def roomscore(rn):
    room = Room.query.filter_by(name=rn).first()
    rank = redis.zrevrange(room.name + "_score", 0, -1, withscores=True, score_cast_func=int)
    rank = dict(rank)
    return jsonify(rank=rank, rank_html=render_template('chat/_ranks.html', users=room.users, rank=rank),
                   room=room.name)


@chat_bp.route('/room/<string:rn>/refreshleader')
def refreshleader(rn):
    room = Room.query.filter_by(name=rn).first()
    return jsonify(leader_html=render_template('chat/_top_bar_status_users.html', users=room.users, leader=room.leader),
                   room=room.name,
                   leader=room.leader)


@chat_bp.route('/room/<string:rn>/ready')
def refreshreadystatus(rn):
    room = Room.query.filter_by(name=rn).first()
    users_status = redis.hgetall(room.name)
    all_ready = True
    for user,status in users_status.items():
        if user != room.leader and status == "0":
            all_ready = False
            break
    print(users_status)
    return jsonify(
        status_html=render_template('chat/_top_bar_status_users.html', users=room.users, leader=room.leader,
                                               status=users_status),
        userStatus=users_status,
        allReady = all_ready,
        room=room.name)

