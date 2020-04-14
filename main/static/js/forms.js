$(document).ready(function () {
    // login form
    $('.login.ui.form')
        .form({
            fields: {
                email: {
                    identifier: 'email',
                    rules: [{
                        type: 'empty',
                        prompt: 'Please enter your e-mail'
                    },
                        {
                            type: 'email',
                            prompt: 'Please enter a valid e-mail'
                        }
                    ]
                },
                password: {
                    identifier: 'password',
                    rules: [{
                        type: 'empty',
                        prompt: 'Please enter your password'
                    },
                        {
                            type: 'minLength[6]',
                            prompt: 'Your password must be at least 6 characters'
                        }
                    ]
                }
            }
        });

    // register form
    $('.register.ui.form')
        .form({
            inline: true,
            fields: {
                nickname: {
                    identifier: 'nickname',
                    rules: [{
                        type: 'empty',
                        prompt: 'Please enter your name'
                    },
                        {
                            type: 'maxLength[12]',
                            prompt: 'Your nickname must be not more than {ruleValue} characters'
                        }
                    ]
                },
                email: {
                    identifier: 'email',
                    rules: [{
                        type: 'empty',
                        prompt: 'Please enter your e-mail'
                    },
                        {
                            type: 'email',
                            prompt: 'Please enter a valid e-mail'
                        }
                    ]
                },
                password: {
                    identifier: 'password1',
                    rules: [{
                        type: 'empty',
                        prompt: 'Please enter a password'
                    },
                        {
                            type: 'minLength[6]',
                            prompt: 'Your password must be at least {ruleValue} characters'
                        }
                    ]
                },
                password2: {
                    identifier: 'password2',
                    rules: [{
                        type: 'empty',
                        prompt: 'Please enter a password'
                    },
                        {
                            type: 'minLength[6]',
                            prompt: 'Your password must be at least {ruleValue} characters'
                        },
                        {
                            type: 'match[password]',
                            prompt: 'Your confirm password must be match the value of the password field'
                        }
                    ]
                }
            }
        });


        // Login Room form
    $('.room.ui.form.left.icon.input')
        .form({
            fields: {
                room: {
                    identifier: 'room',
                    rules: [
                    {
                        type: 'empty',
                        prompt: 'Please enter right room name'
                    }
                    ]
                }
            }
        });

});
