from flask import Blueprint, redirect, url_for, request, flash, render_template
from flask_login import current_user, login_user, login_required, logout_user
from main.models import User
from main.extensions import db
from main.forms import RegisterForm

auth_bp = Blueprint('auth',__name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        flash('You already log in.')
        return redirect(url_for('chat.index'))
    print(request)
    if request.method == 'POST':
        email = request.form['email']
        email = email.lower()
        password = request.form['password']
        user = User.query.filter_by(email=email).first()
        if user is not None:
            if user.verify_password(password):
                flash('Welcome.')
                login_user(user)
            else:
                flash('You email or password is wrong, please try again')
        else:
            flash('Sorry, the account doesn`t exist.')
    return redirect(url_for('chat.index'))

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('chat.index'))


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()
    if current_user.is_authenticated:
        return redirect(url_for('chat.index'))
    print(request)

    if request.method == 'POST':
        email = request.form['email'].lower()
        user = User.query.filter_by(email=email).first()
        if user is not None:
            print('user already registered')
            flash('The email is already registered, please log in.')
            return redirect(url_for('chat.index'))

        nickname = request.form['nickname']
        password = request.form['password1']
        user = User(email=email, nickname=nickname)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return redirect(url_for('chat.index'))

    return render_template('auth/register.html', form=form)





