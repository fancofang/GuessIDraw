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

    // // Listen browser refresh event
    // window.addEventListener('beforeunload', function (e) {
    //     // Cancel the event
    //     e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    //     // Chrome requires returnValue to be set
    //     e.returnValue = '';
    //     // alert("Data will be lost if you leave the page, are you sure?")
    // });

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
            document.title = $('#room_id').data('room') + ' - GuessIDraw';
        });
        activateSemantics();
        scrollToBottom();
    }

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

    function inform(message) {
        var x = document.getElementById("snackbar")
        x.className = "show";
        x.innerHTML = message;
        setTimeout(function () {
            x.className = x.className.replace("show", "");
        }, 3000);
    };

    function refreshscores() {
        $.ajax({
            url: refresh_score_url,
            type: 'GET',
            success: function (data) {
                $('#rank').html(data.rank_html);
            },
            error: function () {
                console.log("wrong refresh rank")
            }
        });
    };

    function refreshleader() {
        $.ajax({
            url: refresh_leader_url,
            type: 'GET',
            success: function (data) {
                $('#user-online').html(data.leader_html);
            },
            error: function () {
                console.log("wrong refresh leader")
            }
        });
    };

    function changeleader() {
        $.ajax({
            url: change_leader_url,
            type: 'GET',
            success: function (data) {
                socket.emit('leave', {data: 'I\'m leave!', room: $('#room_id').data('room')});
                socket.emit('updatecanvas', {
                    data: 'update canvas',
                    room: $('#room_id').data('room'),
                    leader: data.data.leader
                });
            },
            error: function () {
                console.log("wrong refresh leader")
            }
        });
    };


    function refreshreadystatus() {
        $.ajax({
            url: refresh_ready_url,
            type: 'GET',
            success: function (data) {
                $('#user-online').html(data.status_html);
                if (data.allReady) {
                    $('#begin').removeClass('disabled');
                } else {
                    $('#begin').addClass('disabled');
                }
            },
            error: function () {
                console.log("wrong refresh status")
                // $('.ui.loader').toggleClass('active');
            }
        });
    };

    function getTopic() {
        $.ajax({
            url: get_topic,
            type: 'GET',
            success: function (data) {
                console.log("get Topic", data)
                $('#question .content .description').text(data.topic)
            },
            error: function () {
                console.log("wrong get topic")
            }
        });
    };

    function answerQuetion(data) {
        $.ajax({
            url: check_answer_url,
            type: 'GET',
            data: {answer: data},
            success: function (data) {
                if (data.result == 'correct') {
                    $("#checkanswer").removeClass('close red');
                    $("#checkanswer").addClass('check circle green');
                    socket.emit('stopDraw', {data: 'got the point', user: data.user, room: $('#room_id').data('room')});
                } else {
                    console.log("wrong answer")
                    $("#checkanswer").removeClass('check circle green');
                    $("#checkanswer").addClass('close red');
                }
            }
        });
    };

    function resetAll() {
        $("#answer .ui.input").remove();
        $('#answer .content .description').text('');
        $("#checkanswer").removeClass('close red check circle green');
        $('#ready').removeClass('active');
        $('#ready').removeClass('disabled');
        $('#question .content .description').text('');
        //clean canvas
        cleancanvas();
        refreshscores();
        //after reset, need to refresh ready status.

    };


    var socket = io();

    // connect to socket, send to server to join room
    socket.on('connect', function () {
        socket.emit('join', {data: 'I\'m connected!', room: $('#room_id').data('room')});
    });

    socket.on('my_response', function (msg, cb) {
        // run different function depending on different type
        if (msg.type == 'join') {
            refreshscores();
            refreshleader();
            $('.messages').append(msg.message_html);
            scrollToBottom();
        } else if (msg.type == 'beforeleave') {
            if (msg.changeLeader) {
                window.location.href = $('#leave-button').data('url');
                changeleader()
            } else {
                window.location.href = $('#leave-button').data('url');
            }
        } else if (msg.type == 'leave') {
            refreshscores();
            refreshleader();
            $('.messages').append(msg.message_html);
            scrollToBottom();
        } else if (msg.type == 'updatecanvas') {
            $('#refreshcanvas').html(msg.canvas_html);
            $('#beginOrReady-button').html(msg.button_html);
            drawer.saveVar = msg.leader
        } else if (msg.type == 'ready' || msg.type == 'cancel') {
            refreshreadystatus();
        } else if (msg.type == 'countdown') {
            $('.ui.modal.basic').modal('setting', 'closable', false).modal('show');
            setTimeout(function () {
                $('.ui.modal.basic').modal('hide');
                if (current_user_name == msg.leader) {
                    getTopic();
                } else {
                    var ans_area = "<div class=\"ui input\"><input id=\"answer-textarea\" type=\"text\" placeholder=\"your answer...\"></div>";
                    $('#answer').append(ans_area)
                }
                $('#begin').addClass('disabled');
                $('#ready').addClass('disabled');
            }, 3500)
        } else if (msg.type == 'endRound') {
            if (current_user_name == msg.leader) {
                socket.emit('reset', {data: 'reset server all status', room: $('#room_id').data('room')});
            }
            resetAll();
            socket.emit('inform', {data: msg.rightman + ' ' + msg.data, room: $('#room_id').data('room')});
        } else if (msg.type == 'inform') {
            inform(msg.data);
        } else if (msg.type == 'reset') {
            refreshreadystatus();
        }
    });

    // receive server "new message" event
    socket.on('new_message', function (data) {
        message_count++;
        // if browser not in focus
        if (!document.hasFocus()) {
            document.title = '(' + message_count + ') ' + 'GuessIDraw';
        }
        $('.messages').append(data.message_html);
        flask_moment_render_all();
        scrollToBottom();
    });

    // receive "draw" event
    socket.on('draw', function (msg) {
        //send to other people to clean canvas
        if (msg.type == 'clean') {
            cleancanvas();
        }
        //send to other people draw details
        else {
            showoncanvas(msg.data);
        }
    });

    socket.on('inform', function (data) {
        inform(data['message']);
    });


//     //receive server "leave room" event
//     socket.on('confirmleave', function(data) {
//         online = document.getElementsByClassName('ui image label');
//         for(var i=0;i<online.length;i++){
//             name = online[i].innerText.replace(/^\s+|\s+$/g,"");
// //            console.log(online[i].innerText);
//             if (data.user_name == name) {
//                 online[i].parentNode.removeChild(online[i]);
//             }
//         };
//         if (data.user_id == current_user_id){
//             $.ajax({
//                     url: leader_url,
//                     type: 'GET',
//                     success: function (person) {
//                         socket.emit('renew',{person});
//                         socket.emit('inform',{message:data.message});
//                         window.location.href = leave_url;
//                     },
//                     error: function () {
//                         alert('If you leave, the room will be deleted');
//                         window.location.href = leave_url;
//                 }
//             });
//         };
//     });

    //  //receive server "join room" event
    // socket.on('confirmjoin', function(data) {
    //     socket.emit('inform',{message:data.message});
    //     online = document.getElementsByClassName('ui image label');
    //     for(var i=0;i<online.length;i++){
    //         name = online[i].innerText.replace(/^\s+|\s+$/g,"");
    //         if (data.user_name == name) {
    //             online[i].parentNode.removeChild(online[i]);
    //         }
    //     };
    //     $('#user-online').append(data.user_html);
    // });

    // // receive server "answer process" event
    // socket.on('answerprocess', function(data) {
    //     $('.ClassyCountdown-wrapper').remove();
    //     cleancanvas();
    //     if(current_user_name == drawer){
    //         $('#countdown').ClassyCountdown({
    //         theme: data.theme,
    //         end: $.now() + data.second,
    //         onEndCallback: function() {
    //             $('#begin').removeClass('disabled');
    //             online = document.getElementsByClassName('ui image label');
    //             for(var i=0;i<online.length;i++){
    //                 name = online[i].innerText.replace(/^\s+|\s+$/g,"");
    //                 if (name != drawer) {
    //                     online[i].getElementsByTagName('i')[0].classList.remove('check','circle','green');
    //                 }
    //             };
    //             $.ajax({
    //                 url: clean_topic_url,
    //                 type: 'GET',
    //                 success: function (person) {
    //                 }
    //             });
    //             socket.emit('updatescore',{});
    //         }
    //     });
    //     }
    //     else{
    //         $('#ready').addClass('disabled');
    //         $('#countdown').ClassyCountdown({
    //         theme: data.theme,
    //         end: $.now() + data.second,
    //         onEndCallback: function() {
    //             $('#ready').removeClass('ready disabled');
    //             $('#answer-textarea').val('');
    //             $('#answer .description').val('');
    //             $("#checkanswer").removeClass('close red check circle green');
    //             online = document.getElementsByClassName('ui image label');
    //             for(var i=0;i<online.length;i++){
    //                 name = online[i].innerText.replace(/^\s+|\s+$/g,"");
    //                 if (name != drawer) {
    //                     online[i].getElementsByTagName('i')[0].classList.remove('check','circle','green');
    //                 }
    //             };
    //         }
    //     });
    //     }
    //
    // });


    // submit leave room
    $('#leave-button, #sidebar-leave-button').on('click', function () {
        alert('Your score will be deleted if you leave.');
        // window.location.href = $('#leave-button').data('url');
        socket.emit('beforeleaving', {data: 'I\'m leave!', room: $('#room_id').data('room')});
    });

    // submit message
    $('#message-textarea').on('keydown', function (e) {
        var $textarea = $('#message-textarea');
        var message_body = $textarea.val().trim();
        if ((e.which === ENTER_KEY || e.keyCode === ENTER_KEY) && !e.shiftKey && message_body) {
            e.preventDefault();
            socket.emit('send_message', {data: message_body, room: $('#room_id').data('room')});
            $textarea.val('')
        }
    });

    // submit draw
    $('#myCanvas').on('mousemove', function () {
        socket.emit('mousemove', {data: senddata, room: $('#room_id').data('room'), type: "draw"});
    });

    // submit mobile draw
    $('#myCanvas').on('touchstart touchmove touchend', function () {
        socket.emit('mousemove', {data: senddata, room: $('#room_id').data('room'), type: "draw"});
    });

    // moniter host clean canvas
    $('.canvas-container').on('click', '#reSetCanvas', function () {
        socket.emit('mousemove', {data: senddata, room: $('#room_id').data('room'), type: "clean"});
    });

    // submit begin the game
    $('#message-input-area').on('click', '#begin', function () {
        $.ajax({
            url: refresh_ready_url,
            type: 'GET',
            success: function (data) {
                if (data.allReady) {
                    socket.emit('activeCountdown', {
                        data: 'active count down to draw',
                        room: $('#room_id').data('room')
                    });
                    // $('body > .ui.page.dimmer').dimmer('show');
                }
            },
            error: function () {
                console.log("wrong refresh status")
                // $('.ui.loader').toggleClass('active');
            }
        });
    });

    //submit ready
    $('#ready').on('click', function () {
        $('#ready').toggleClass('active');
        if ($('#ready').hasClass('active')) {
            // socket.emit('ready',{status:'ready'});
            socket.emit('ready', {data: 'ready', room: $('#room_id').data('room')});
        } else {
            socket.emit('cancel', {data: 'cancel', room: $('#room_id').data('room')});
        }
    });

    $('#answer').on('keyup', "#answer-textarea", function (e) {
        var $textarea = $('#answer-textarea');
        var message_body = $textarea.val().trim();
        $('#answer .description').text(message_body);
        if ((e.which === ENTER_KEY || e.keyCode === ENTER_KEY) && !e.shiftKey && message_body) {
            e.preventDefault();
            answerQuetion(message_body)
            // socket.emit('send_message', {data: message_body, room: $('#room_id').data('room')});
            $textarea.val('')
        }
    });

    init();

});