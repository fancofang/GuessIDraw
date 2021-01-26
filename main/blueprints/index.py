from flask import Blueprint, render_template, jsonify, redirect, url_for, app

index_bp = Blueprint('index',__name__)

@index_bp.route('/')
def index():
    return render_template('index.html')

@index_bp.route('/howToPlay')
def howToPlay():
    return render_template('howToPlay.html')

@index_bp.route('/test')
def test_page():
    return str(1/0)