$(document).ready(function () {
    var socket = io('/');

    // browsertitle remind message count
    var message_count = 0;

    var page = 1;

    var ENTER_KEY = 13;
//    var socket = io.connect();

    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrf_token);
            }
        }
    });

    function scrollToBottom() {
        var $messages = $('.messages');
        $messages.scrollTop($messages[0].scrollHeight);
    }

    function load_messages() {
        var $messages = $('.messages');
        var position = $messages.scrollTop();
        if (position === 0) {
            page++;
            $('.ui.loader').toggleClass('active');
            $.ajax({
                url: messages_url,
                type: 'GET',
                data: {page: page},
                success: function (data) {
                    var before_height = $messages[0].scrollHeight;
                    $(data).prependTo(".messages").hide().fadeIn(800);
                    var after_height = $messages[0].scrollHeight;
                    flask_moment_render_all();
                    $messages.scrollTop(after_height - before_height);
                    $('.ui.loader').toggleClass('active');
                    activateSemantics();
                },
                error: function () {
                    $('.ui.loader').toggleClass('active');
                }
            });
        }
    }

    // submit message
    function new_message(e) {
        var $textarea = $('#message-textarea');
        var message_body = $textarea.val().trim();
        if (e.which === ENTER_KEY && !e.shiftKey && message_body) {
            socket.emit('new message', message_body);
            $textarea.val('')
        }
    };

    // submit leave room
    function leave_room() {
        socket.emit('leave', {});
    }

    function messageNotify(data) {
        if (Notification.permission !== "granted")
            Notification.requestPermission();
        else {
            var notification = new Notification("Message from " + data.nickname, {
                icon: data.gravatar,
                body: data.message_body.replace(/(<([^>]+)>)/ig, "")
            });

            notification.onclick = function () {
                window.open(root_url);
            };
            setTimeout(function () {
                notification.close()
            }, 4000);
        }
    }

    function activateSemantics() {
        $('.ui.dropdown').dropdown();
        $('.ui.checkbox').checkbox();

        $('.message .close').on('click', function () {
            $(this).closest('.message').transition('fade');
        });
    };


    function inform(message) {
        var x = document.getElementById("snackbar")
        x.className = "show";
        x.innerHTML = message;
        setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
    };




    function init() {
        // desktop notification
        document.addEventListener('DOMContentLoaded', function () {
            if (!Notification) {
                alert('Desktop notifications not available in your browser.');
                return;
            }
            if (Notification.permission !== "granted")
                Notification.requestPermission();
        });
        $(window).focus(function () {
            message_count = 0;
            document.title = 'DrawSomething';
        });
        activateSemantics();
        scrollToBottom();
    }


    //socket functions
    //receive server "leave room" event
    socket.on('confirmleave', function(data) {
        online = document.getElementsByClassName('ui image label');
        for(var i=0;i<online.length;i++){
            name = online[i].innerText.replace(/^\s+|\s+$/g,"");
//            console.log(online[i].innerText);
            if (data.user_name == name) {
                online[i].parentNode.removeChild(online[i]);
            }
        };
        if (data.user_id == current_user_id){
            $.ajax({
                    url: leader_url,
                    type: 'GET',
                    success: function (person) {
                        socket.emit('renew',{person});
                        socket.emit('inform',{message:data.message});
                        window.location.href = leave_url;
                    },
                    error: function () {
                        alert('If you leave, the room will be deleted');
                        window.location.href = leave_url;
                }
            });
        };
    });

     //receive server "join room" event
    socket.on('confirmjoin', function(data) {
        socket.emit('inform',{message:data.message});
        online = document.getElementsByClassName('ui image label');
        for(var i=0;i<online.length;i++){
            name = online[i].innerText.replace(/^\s+|\s+$/g,"");
            if (data.user_name == name) {
                online[i].parentNode.removeChild(online[i]);
            }
        };
        $('#user-online').append(data.user_html);
    });

    // receive server "answer process" event
    socket.on('answerprocess', function(data) {
        $('.ClassyCountdown-wrapper').remove();
        cleancanvas();
        if(current_user_name == drawer){
            $('#countdown').ClassyCountdown({
            theme: data.theme,
            end: $.now() + data.second,
            onEndCallback: function() {
                $('#begin').removeClass('disabled');
                online = document.getElementsByClassName('ui image label');
                for(var i=0;i<online.length;i++){
                    name = online[i].innerText.replace(/^\s+|\s+$/g,"");
                    if (name != drawer) {
                        online[i].getElementsByTagName('i')[0].classList.remove('check','circle','green');
                    }
                };
                $.ajax({
                    url: clean_topic_url,
                    type: 'GET',
                    success: function (person) {
                    }
                });
                socket.emit('updatescore',{});
            }
        });
        }
        else{
            $('#ready').addClass('disabled');
            $('#countdown').ClassyCountdown({
            theme: data.theme,
            end: $.now() + data.second,
            onEndCallback: function() {
                $('#ready').removeClass('ready disabled');
                $('#answer-textarea').val('');
                $('#answer .description').val('');
                $("#checkanswer").removeClass('close red check circle green');
                online = document.getElementsByClassName('ui image label');
                for(var i=0;i<online.length;i++){
                    name = online[i].innerText.replace(/^\s+|\s+$/g,"");
                    if (name != drawer) {
                        online[i].getElementsByTagName('i')[0].classList.remove('check','circle','green');
                    }
                };
            }
        });
        }

    });

    // receive server "update score" event
    socket.on('updatescore', function(data) {
        online = document.getElementsByClassName('rank-item');
        for(var i=0;i<online.length;i++){
            header = online[i].getElementsByClassName("content")[0].getElementsByClassName("header")[0]
            score = online[i].getElementsByClassName("content")[0].getElementsByClassName("point")[0]
            name = header.innerText.replace(/^\s+|\s+$/g,"");
            if (name in data){
                score.innerText = data[name];
            }
        };
//        $('.user-image').append(data.user_html);
    });

    // connect to socket, send to server to join room
    socket.on('connect', function() {
        socket.emit('joined',{});
    });

    socket.on('changeleader', function(data) {
        online = document.getElementsByClassName('ui image label');
        for(var i=0;i<online.length;i++){
            name = online[i].innerText.replace(/^\s+|\s+$/g,"");
            if (data.leader == name) {
                online[i].getElementsByTagName('i')[0].setAttribute("class","user secret icon");
            }
        };
        location.reload();
    });

    // receive "draw" event
    socket.on('draw', function (drawdata) {
        //send to other people draw details
        showoncanvas(drawdata);
    });

    socket.on('inform', function (data) {
        inform(data['message']);
    });

    // receive "ready" event
    socket.on('ready', function (data) {
        online = document.getElementsByClassName('ui image label');
        for(var i=0;i<online.length;i++){
            name = online[i].innerText.replace(/^\s+|\s+$/g,"");
            if (data.user_name == name) {
                 online[i].getElementsByTagName('i')[0].classList.add('check','circle','green');
            }
        };
    });

    // receive "cancel ready" event
    socket.on('cancel', function (data) {
        online = document.getElementsByClassName('ui image label');
        for(var i=0;i<online.length;i++){
            name = online[i].innerText.replace(/^\s+|\s+$/g,"");
            if (data.user_name == name) {
                 online[i].getElementsByTagName('i')[0].classList.remove('check','circle','green');
            }
        };
    });

    // receive server "new message" event
    socket.on('new message', function (data) {
        message_count++;
        // if browser not in focus
        if (!document.hasFocus()) {
            document.title = '(' + message_count + ') ' + 'CatChat';
        }
        if (data.user_id !== current_user_id) {
            messageNotify(data);
        }
        $('.messages').append(data.message_html);
        flask_moment_render_all();
        scrollToBottom();
        activateSemantics();
    });


    // submit message
    $('#message-textarea').on('keydown', new_message.bind(this));

    // submit draw
    $('#myCanvas').on('mousemove', function(){
        socket.emit('mousemove', senddata);
    });

    // submit mobile draw
    $('#myCanvas').on('touchstart', function(){
        socket.emit('mousemove', senddata);
    });
    $('#myCanvas').on('touchmove', function(){
        socket.emit('mousemove', senddata);
    });
    $('#myCanvas').on('touchend', function(){
        socket.emit('mousemove', senddata);
    });

    // moniter host clean canvas
    $('#reSetCanvas').on('click', function(){
        socket.emit('mousemove', senddata);
    });

    // submit leave room
    $('.quit').on('click', function(){
        leave_room();
    });


    // submit begin the game
    $('#begin').on('click', function(){
        let isready = true;
        online = document.getElementsByClassName('ui image label');
        for(var i=0;i<online.length;i++){
            name = online[i].innerText.replace(/^\s+|\s+$/g,"");
            if (drawer == name) {
                continue;
            }
            if (!online[i].getElementsByTagName('i')[0].classList.contains('check')) {
                 isready = false;
                 break;
            }
        };
        if (isready) {
            var beginanswer ={
            theme: "flat-colors-very-wide",
            second:60,
            };
            $.ajax({
                url:return_topic,
                success:function(result){
                    $('.description').text(result);
                    socket.emit('answertime', beginanswer);
                    $('#begin').addClass('disabled');
            }});
        }
        else {
            inform("someone is not ready!");
        }
    });

    //submit ready
    $('#ready').on('click', function(){
        $('#ready').toggleClass('ready');
        if($('#ready').hasClass('ready')){
            socket.emit('ready',{status:'ready'});
        }
        else{
            socket.emit('cancel',{status:'cancel'});
        }
    });

    // load more messages
    $('.messages').scroll(load_messages);

    $("#answer-textarea").change(function(){
        var $answer_textarea = $('#answer-textarea');
        var input =$answer_textarea.val();
        $('#answer .description').text(input);
        $.ajax({
            url:check_answer_url,
            type: 'GET',
            data:{answer:input},
            success:function(result){
                if (result == 'right'){
                    $("#checkanswer").addClass('check circle green');
                    $("#checkanswer").removeClass('close red');
                    socket.emit('inform',{message:'Someone answer is correct'});
                    inform("You answer is correct");
                }
                else{
                    $("#checkanswer").removeClass('check circle green');
                    $("#checkanswer").addClass('close red');
                }
            }});

    });

    init();

});