from wtforms import Form, StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length, Email, EqualTo



class RegisterForm(Form):
    nickname = StringField('nickname',validators=[DataRequired()], render_kw={'placeholder':'Fanco'})
    email =StringField('email', validators=[DataRequired,Email], render_kw={'placeholder':'abc@hotmail.com'})
    password1 = StringField('password', validators=[DataRequired], render_kw={'placeholder':'password'})
    password2 = StringField('password', validators=[DataRequired,EqualTo(password1)], render_kw={'placeholder':'confirm password'})
    submit = SubmitField('Join',render_kw={'class':'ui blue submit button fluid'})

