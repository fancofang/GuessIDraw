$(document).ready(function () {
    var page = 1;

    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrf_token);
            }
        }
    });


    // drawing page sidebar menu
    $('#toggle-sidebar').on('click', function () {
        $('.menu.sidebar').sidebar('setting', 'transition', 'overlay').sidebar('toggle');
    });


    // load more messages
    $('.messages').scroll(load_messages);

    function load_messages() {
        var $messages = $('.messages');
        var position = $messages.scrollTop();
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
                    $('.ui.loader').toggleClass('active');
                }
            });
        }
    }


})
