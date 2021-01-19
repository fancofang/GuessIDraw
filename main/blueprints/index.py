from flask import Blueprint, render_template, jsonify, redirect, url_for

from main.models import Room,User

index_bp = Blueprint('index',__name__)

@index_bp.route('/')
def index():
    return render_template('index.html')


@index_bp.route('/test')
def test_page():
    # room = Room.query.filter_by(name='1234').first()
    # return jsonify(result="success", type='test')
    return redirect(url_for('chat.checkUserRoom'))