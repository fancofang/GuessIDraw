$(document).ready(function () {

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
        console.log(name,pass);
        if (name.trim() !== '') {
            $.ajax({
                url: create_room_url,
                type: 'POST',
                data:{
                    name: name,
                    pass: pass
                },
                success: function (data) {
                    $room_textarea.val('');
                    $pass_textarea.val('');
                    window.location.href = join_url

                }
            });
        }
    });

    $('#show-create-room-modal').on('click', function () {
        $('.ui.modal.room').modal({blurring: true}).modal('show');
    });

    window.setTimeout(function() {
    $('.alert').fadeTo(500,0.5).slideUp(500,function(){$('.alert').remove()});
    }, 2000);


    $('#toggle-sidebar').on('click', function () {
        $('.menu.sidebar').sidebar('setting', 'transition', 'overlay').sidebar('toggle');
    });



});
