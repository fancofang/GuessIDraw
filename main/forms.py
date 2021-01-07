from wtforms import StringField, PasswordField, SubmitField, BooleanField
from wtforms.validators import DataRequired, Length, Email, EqualTo
from flask_wtf import FlaskForm



class RegisterForm(FlaskForm):
    nickname = StringField('nickname',validators=[DataRequired()], render_kw={'placeholder':'Jack'})
    email =StringField('email', validators=[DataRequired(),Email()], render_kw={'placeholder':'abc@hotmail.com'})
    password1 = StringField('password', validators=[DataRequired()], render_kw={'placeholder':'password'})
    password2 = StringField('password', validators=[DataRequired(),EqualTo(password1)], render_kw={'placeholder':'confirm password'})
    submit = SubmitField('Join',render_kw={'class':'ui blue submit button fluid'})

class LoginForm(FlaskForm):
	email = StringField('Email', validators=[DataRequired(), Length(1, 254), Email()])
	password = PasswordField('Password', validators=[DataRequired(), Length(1, 128)])
	remember = BooleanField('Remember me')
	submit = SubmitField('Log in',render_kw={'class':'ui blue submit button fluid'})