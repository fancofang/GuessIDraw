$(document).ready(function () {
    // browsertitle remind message count
    var message_count = 0;


    var ENTER_KEY = 13;

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

    function activateSemantics() {
        $('.ui.dropdown').dropdown();
        $('.ui.checkbox').checkbox();

        //delete message
        $('#socket_message').on('click', 'i', function () {
            $(this).closest('.message').transition('fade');
        });
    };

    function refreshscores() {
        $.ajax({
            url: refresh_score_url,
            type: 'GET',
            success: function (data) {
                console.log("refresh scores")
                console.log(data)
                $('#rank').html(data.rank_html);
            },
            error: function () {
                console.log("wrong refresh rank")
                // $('.ui.loader').toggleClass('active');
            }
        });
    };

    function refreshleader() {
        $.ajax({
            url: refresh_leader_url,
            type: 'GET',
            success: function (data) {
                console.log("refresh leader")
                console.log(data)
                $('#user-online').html(data.leader_html);
            },
            error: function () {
                console.log("wrong refresh rank")
                // $('.ui.loader').toggleClass('active');
            }
        });
    };

    function refreshreadystatus() {
        $.ajax({
            url: refresh_ready_url,
            type: 'GET',
            success: function (data) {
                console.log("refresh status")
                console.log(data)
                $('#user-online').html(data.status_html);
            },
            error: function () {
                console.log("wrong refresh rank")
                // $('.ui.loader').toggleClass('active');
            }
        });
    };





    var socket = io();

    // connect to socket, send to server to join room
    socket.on('connect', function() {
        console.log("connect")
        console.log($('#room_id').data('room'))
        socket.emit('join',{data: 'I\'m connected!', room:$('#room_id').data('room')});
    });

    // submit leave room
    $('#leave-button, #sidebar-leave-button').on('click', function(){
        socket.emit('leave',{data: 'I\'m leave!', room:$('#room_id').data('room')});
        window.location.href = $('#leave-button').data('url');
    });

    socket.on('my_response', function(msg, cb) {
        // run different function depending on different type
        if (msg.type == 'join' || msg.type == 'leave') {
            console.log("wow,some leave", msg.type)
            // 要执行刷新部分界面的程序
            refreshscores();
            refreshleader();
            $('.messages').append(msg.message_html);
            scrollToBottom();
        }
        else if( msg.type == 'ready' || msg.type == 'cancel'){
            refreshreadystatus();
        }
        // if (msg.type == 'join') {
        //     // 要执行刷新部分界面的程序
        // }
        // else if(msg.type == 'leave')
        // {
        //
        // }

        // $.ajax({
        //     url: refresh_url,
        //     type: 'GET',
        //     success: function (data) {
        //         console.log(data)
        //         $('#rank').html(data.rank_html);
        //     },
        //     error: function () {
        //         console.log("wrong refresh rank")
        //         // $('.ui.loader').toggleClass('active');
        //     }
        // });

    });





    // submit message
    $('#message-textarea').on('keydown', new_message.bind(this));

    // submit message
    function new_message(e) {
        var $textarea = $('#message-textarea');
        var message_body = $textarea.val().trim();
        if (e.which === ENTER_KEY && !e.shiftKey && message_body) {
            e.preventDefault();
            console.log("ready to send server",message_body)
            socket.emit('send_message', { data: message_body, room:$('#room_id').data('room')});
            $textarea.val('')
        }
    };

     // receive server "new message" event
    socket.on('new_message', function (data) {
        console.log("new message",data.message_body)
        message_count++;
        // if browser not in focus
        if (!document.hasFocus()) {
            document.title = '(' + message_count + ') ' + 'GuessIDraw';
        }
        $('.messages').append(data.message_html);
        flask_moment_render_all();
        scrollToBottom();
        // activateSemantics();
    });


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
            document.title = $('#room_id').data('room') +' - GuessIDraw';
        });
        activateSemantics();
        scrollToBottom();
    }




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

//     // receive server "update score" event
//     socket.on('updatescore', function(data) {
//         online = document.getElementsByClassName('rank-item');
//         for(var i=0;i<online.length;i++){
//             header = online[i].getElementsByClassName("content")[0].getElementsByClassName("header")[0]
//             score = online[i].getElementsByClassName("content")[0].getElementsByClassName("point")[0]
//             name = header.innerText.replace(/^\s+|\s+$/g,"");
//             if (name in data){
//                 score.innerText = data[name];
//             }
//         };
// //        $('.user-image').append(data.user_html);
//     });


    // socket.on('changeleader', function(data) {
    //     online = document.getElementsByClassName('ui image label');
    //     for(var i=0;i<online.length;i++){
    //         name = online[i].innerText.replace(/^\s+|\s+$/g,"");
    //         if (data.leader == name) {
    //             online[i].getElementsByTagName('i')[0].setAttribute("class","user secret icon");
    //         }
    //     };
    //     location.reload();
    // });

    // receive "draw" event
    socket.on('draw', function (drawdata) {
        //send to other people draw details
        showoncanvas(drawdata);
    });

    socket.on('inform', function (data) {
        inform(data['message']);
    });


    // // receive "ready" event
    // socket.on('ready', function (data) {
    //     online = document.getElementsByClassName('ui image label');
    //     for(var i=0;i<online.length;i++){
    //         name = online[i].innerText.replace(/^\s+|\s+$/g,"");
    //         if (data.user_name == name) {
    //              online[i].getElementsByTagName('i')[0].classList.add('check','circle','green');
    //         }
    //     };
    // });
    //
    // // receive "cancel ready" event
    // socket.on('cancel', function (data) {
    //     online = document.getElementsByClassName('ui image label');
    //     for(var i=0;i<online.length;i++){
    //         name = online[i].innerText.replace(/^\s+|\s+$/g,"");
    //         if (data.user_name == name) {
    //              online[i].getElementsByTagName('i')[0].classList.remove('check','circle','green');
    //         }
    //     };
    // });


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
            // socket.emit('ready',{status:'ready'});
            socket.emit('ready',{data: 'ready', room:$('#room_id').data('room')});
        }
        else{
            socket.emit('cancel',{data: 'cancel', room:$('#room_id').data('room')});
        }
    });



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