from flask import Blueprint, redirect, url_for, request, flash, render_template, session
from flask_login import current_user, login_user, login_required, logout_user
from main.models import User
from main.extensions import db
from main.forms import RegisterForm, LoginForm
from main.utilities import redirect_back

auth_bp = Blueprint('auth',__name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        flash('You already log in.')
        return redirect(url_for('chat.index'))
    print("check login")
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data.lower()).first()
        if user is not None:
            password = form.password.data
            if user.verify_password(password):
                print("login in success")
                remember = form.remember.data
                login_user(user,remember)
                return redirect(url_for('chat.platform'))
            else:
                flash('You email or password is wrong, please try again')
        else:
            flash('Sorry, the account doesn`t exist.')
    return render_template("auth/login.html", form = form)
    
    

@auth_bp.route('/logout')
@login_required
def logout():
    # session['id'] = current_user.id
    logout_user()
    # return redirect(url_for('chat.leave_room'))
    return redirect_back()


@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index.index'))
    form = RegisterForm()
    if form.validate_on_submit():
        email = request.form['email'].lower()
        user = User.query.filter_by(email=email).first()
        print(user)
        if user is not None:
            flash('The email is already registered, please log in.')
            return redirect(url_for('auth.login'))
        nickname = request.form['nickname']
        password = request.form['password1']
        user = User(email=email, nickname=nickname)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        flash('Registered successful, please log in.')
        return redirect(url_for('auth.login'))

    return render_template('auth/register.html', form=form)





