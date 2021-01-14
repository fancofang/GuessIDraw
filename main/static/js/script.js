$(document).ready(function () {
    var page = 1;

    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrf_token);
            }
        }
    });

    //create room
    $('#create-room-button').on('click', function () {
        var $room_textarea = $('#create-room-textarea');
        var $pass_textarea = $('#create-room-pass-textarea');
        var name = $room_textarea.val();
        var pass = $pass_textarea.val();
        console.log(name,pass,$('#create-room-button').data("url"));
        if (name.trim() !== '') {
            $.ajax({
                url: $('#create-room-button').data("url"),
                type: 'POST',
                data:{
                    name: name,
                    pass: pass
                },
                success: function (data) {
                    if(data.result == 'success'){
                        console.log(data,data.join_url)
                        $room_textarea.val('');
                        $pass_textarea.val('');
                        window.location.href = data.join_url
                    }
                    else{
                        console.log(data)
                        $room_textarea.val('');
                        $pass_textarea.val('');
                        $(".ui.message.platform p").remove()
                        $(".ui.message.platform").append($("<p></p>").text(data.message));
                        $(".ui.message.platform").toggleClass("hidden");
                        $('.ui.modal.room').modal({blurring: true}).modal('hide');
                        $('.ui.modal.room').modal({blurring: true}).modal('hide');


                    }


                }
            });
        }
    });

    // Open the modal of room created
    $('#show-create-room-modal, #show-create-room-modal-mobile').on('click', function () {
        $('.ui.modal.room').modal({blurring: true}).modal('show');
    });

    window.setTimeout(function() {
    $('.alert').fadeTo(500,0.5).slideUp(500,function(){$('.alert').remove()});
    }, 2000);

    // drawing page sidebar menu
    $('#toggle-sidebar').on('click', function () {
        $('.menu.sidebar').sidebar('setting', 'transition', 'overlay').sidebar('toggle');
    });

    $('.message .close').on('click', function() {
        $(this).closest('.message').transition('fade');
    });

    // platform page sticky
    $('.ui.sticky')
        .sticky({
            context: '#example1'
        })
    ;

    // load more messages
    $('.messages').scroll(load_messages);

    function load_messages() {
        console.log("load messages")
        var $messages = $('.messages');
        var position = $messages.scrollTop();
        console.log(position)
        if (position === 0) {
            page++;
            $('.ui.loader').toggleClass('active');
            $.ajax({
                url: $('#message-area').data('url'),
                type: 'GET',
                data: {page: page},
                success: function (data) {
                    var before_height = $messages[0].scrollHeight;
                    $(data).prependTo(".messages").hide().fadeIn(800);
                    var after_height = $messages[0].scrollHeight;
                    flask_moment_render_all();
                    $messages.scrollTop(after_height - before_height);
                    $('.ui.loader').toggleClass('active');
                },
                error: function () {
                    console.log("meile")
                    $('.ui.loader').toggleClass('active');
                }
            });
        }
    }


})
