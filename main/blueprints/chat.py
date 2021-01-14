import random
from flask import Blueprint, render_template, redirect, url_for, flash, request, session, current_app ,jsonify
from flask_login import current_user, login_required
from main.extensions import db, redis
from main.models import User, Message, Room, Word

chat_bp = Blueprint('chat',__name__)

topic = {}

# redis describtion
# There are serveral type use in redis
# 1. Set type: the key is "room" which store all of room name;
# 2. Zset type: the key is "room name + Score" which store the players in the room and their scores.
# 3. Hash type: the key is "roomstatus", and the field is each of room name. the value is the room status, if 1 that
#    means it's on the game, else means off the game.
# 4. Hash type: the key is each of room name, and the field is each of room member. the value is user's status, if 1 that
#    means he is ready, else means not. Default is 0.






@chat_bp.before_request
def before_request():
    if not current_user.is_authenticated:
        return current_app.login_manager.unauthorized()
    pass

@chat_bp.route('/platform')
def platform():
    rooms = Room.query.all()
    leaders = { room.leader for room in rooms}
    print(leaders)
    leader_dict = { name:User.query.filter_by(nickname=name).first().gravatar for name in leaders}
    # for name in leaders:
    #     user = User.query.filter_by(nickname=name).first()
    #     print(user,user.gravatar)
    #     leader_dict[name] = user.gravatar
    
    # if current_user.is_authenticated:
    #     return render_template('chat/platform.html')
    # room_name = session.get('room')
    # room = Room.query.filter_by(name=room_name).first()
    # if room is not None:
    #     return redirect(url_for('chat.join_room', rid=room.id))
    # session.pop(room_name, None)
    return render_template('chat/platform.html', rooms=rooms, leaders=leader_dict)



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
    return render_template('chat/home.html', messages=messages, user=current_user, room_name=room.name,
                           users=room.users,leader=room.leader, rank=rank)

@chat_bp.route('/create',  methods=['GET', 'POST'])
def create_room():
    name = request.form['name']
    room = Room.query.filter_by(name=name).first()
    if room is None and not redis.sismember("room",name):
        new_room = Room(name=name)
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
        print("success")
        return jsonify(result="success", type="create", room=new_room.name, join_url='/join/'+room.name)
        # return redirect(url_for('chat.join_room', rn=new_room.name))
    return jsonify(result="fail", type="create", message='Sorry, The room is already exist.')

@chat_bp.route('/search',  methods=['GET', 'POST'])
def search_room():
    name = request.form['room']
    room = Room.query.filter_by(name=name).first()
    if room is not None:
        return redirect(url_for('chat.join_room', rn=room.name))
    flash('Sorry, the room doesn`t exist.')
    return redirect(url_for('chat.platform'))

@chat_bp.route('/join/<string:rn>')
def join_room(rn):
    print("ready to join room")
    room = Room.query.filter_by(name=rn).first()
    print(len(room.users))
    if room is None:
        flash("The room doesn't exist.")
        return redirect(url_for('chat.platform'))
    elif redis.hget("roomstatus", room.name) == 1:
        flash('The room is on the game,please join it later.')
        return redirect(url_for('chat.platform'))
    elif (current_user not in room.users) and len(room.users) >= 6:
        flash('Sorry, The room is already full.')
        return redirect(url_for('chat.platform'))
    elif current_user in room.users:
        return redirect(url_for('chat.room', rn=room.name))
    try:
        room.users.append(current_user)
        db.session.commit()
    except:
        flash('Sorry, The room is already full.')
        return redirect(url_for('chat.platform'))
    redis.zadd(room.name + "_score", {current_user.nickname: 0})
    redis.hset(room.name, current_user.nickname, 0)
    return redirect(url_for('chat.room', rn=room.name))
    #
    #
    # count = len(room.users)
    # if redis.sismember('ongame', room.name) == 1:
    #     flash('The room is on the game,please join it later.')
    #     return redirect(url_for('chat.index'))
    # if (current_user not in room.users) and count >= 6:
    #     flash('Sorry, The room is already full.')
    #     return redirect(url_for('chat.index'))
    # if current_user not in room.users:
    #     room.users.append(current_user)
    #     db.session.commit()
    #     a = redis.zadd(room.name, {current_user.nickname: 0})
    # session['room'] = room.name
    # return redirect(url_for('chat.room'))

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
        elif current_user.nickname == room.leader:
            candidate = leader_change(room.name, current_user.nickname)
            print("new leader is ",candidate)
        # checkRoomAndChangeLeader(room.name, user.nickname)
        
        # db.session.commit()
        db.session.commit()
    return redirect(url_for('chat.platform'))


def leader_change(room, old, new=None):
    room = Room.query.filter_by(name=room).first()
    print("current leader:", room.leader)
    person = User.query.filter_by(nickname=new).first()
    print("prefer change:",person)
    if person is not None and person in room.users:
        candidate = person.nickname
    else:
        result = [i for i in room.users if i != old]
        print(result)
        candidate = random.choice(result).nickname
    print("candidate:",candidate)
    leader = room.set_leader(candidate)
    return leader

    
# def checkRoomAndChangeLeader(room, user):
#     room = Room.query.filter_by(name=room).first()
#     if room.leader == user:
#         if len(room.users) == 1:
#             db.session.delete(room)
#             db.session.commit()
#             redis.delete(room.name)
#         else:
#             resultList = [ele for ele in room.user if ele != room.users]
#             leader = resultList[0].nickname
#         room.set_leader(leader)
#         db.session.commit()
#         print("new leader:",room.leader)
#         return room.leader
#     return False

@chat_bp.route('/messages/<string:rn>')
def get_messages(rn):
    page = request.args.get('page', 1, type=int)
    room = Room.query.filter_by(name=rn).first()
    pagination = Message.query.filter_by(room=room).order_by(Message.timestamp.desc()).paginate(
        page, per_page=30 ,error_out=False)
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

@chat_bp.route('/room/<string:rn>/scores')
def roomscore(rn):
    room = Room.query.filter_by(name=rn).first()
    rank = redis.zrevrange(room.name + "_score", 0, -1, withscores=True, score_cast_func=int)
    rank = dict(rank)
    return jsonify(rank=rank, rank_html=render_template('chat/_ranks.html', users=room.users, rank=rank),
                   room=room.name)


@chat_bp.route('/room/<string:rn>/leader')
def refreshleader(rn):
    room = Room.query.filter_by(name=rn).first()
    print("refresh leader", room.users)
    test = {}
    return jsonify(leader_html=render_template('chat/_top_bar_status_users.html', users=room.users, leader=room.leader, users_status=test),
                   room=room.name)



@chat_bp.route('/room/<string:rn>/ready')
def refreshreadystatus(rn):
    room = Room.query.filter_by(name=rn).first()
    users_status = redis.hgetall(room.name)
    print(users_status)
    print(type(users_status))
    return jsonify(
        status_html=render_template('chat/_top_bar_status_users.html', users=room.users, leader=room.leader,
                                               users_status=users_status),
                   room=room.name)
