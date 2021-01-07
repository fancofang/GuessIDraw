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
    form = LoginForm()
    print("a")
    if form.validate_on_submit():
        print("b")
        user = User.query.filter_by(email=form.email.data.lower()).first()
        if user is not None:
            password = form.password.data
            if user.verify_password(password):
                print("c")
                remember = form.remember.data
                print(remember)
                flash('Welcome.')
                login_user(user)
                return redirect(url_for('chat.test_page'))
            else:
                flash('You email or password is wrong, please try again')
        else:
            flash('Sorry, the account doesn`t exist.')
    return render_template("auth/login.html", form = form)
    
    

@auth_bp.route('/logout')
@login_required
def logout():
    session['id'] = current_user.id
    logout_user()
    # return redirect(url_for('chat.leave_room'))
    return redirect_back()


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





