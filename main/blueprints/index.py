from flask import Blueprint, render_template

from main.models import Room,User

index_bp = Blueprint('index',__name__)

@index_bp.route('/')
def index():
    return render_template('index.html')


@index_bp.route('/test')
def test_page():
    rooms = Room.query.all()
    leaders = { room.leader for room in rooms}
    print(leaders)
    leader_dict = { name:User.query.filter_by(nickname=name).first().gravatar for name in leaders}
    return render_template('test.html', rooms=rooms, leaders=leader_dict)