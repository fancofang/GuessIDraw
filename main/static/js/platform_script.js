$(document).ready(function () {
    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrf_token);
            }
        }
    });

    window.setTimeout(function () {
        $('.alert').fadeTo(500, 0.5).slideUp(500, function () {
            $('.alert').remove()
        });
    }, 2000);


    //listen all message, bind event to close
    $(document).on('click', '.message .close', function () {
        $(this).closest('.message').transition('fade');
    });


    //create room
    $('#create-room-button').on('click', function () {
        var $room_textarea = $('#create-room-textarea');
        var $pass_textarea = $('#create-room-pass-textarea');
        var name = $room_textarea.val();
        var pass = $pass_textarea.val();
        if (name.trim() !== '') {
            $.ajax({
                url: $('#create-room-button').data("url"),
                type: 'POST',
                data: {
                    name: name,
                    pass: pass
                },
                success: function (data) {
                    if (data.result == 'success') {
                        console.log(data, data.data.room_url)
                        $room_textarea.val('');
                        $pass_textarea.val('');
                        window.location.href = data.data.room_url
                    } else {
                        $pass_textarea.val('');
                        $('.ui.modal.room.create').modal({blurring: true}).modal('show');
                        // message show on the bottom of creating room modal
                        $("#create-room-message").html("<i class=\"exclamation icon\"></i>" + data.message);
                        $("#create-room-message").removeClass("hidden");
                    }
                }
            });
        }
    });

    function joinRoomWithoutPass(url) {
        console.log(url)
        $.ajax({
            url: url,
            type: 'POST',
            success: function (data) {
                if (data.result == 'success') {
                    window.location.href = data.data.room_url
                } else {
                    console.log(data)
                    // message show on the bottom of personal card
                    $(".message.platform").html("<i class=\"close icon\"></i>" + data.message);
                    $(".message.platform").removeClass("hidden");
                }
            }
        });
    }

    function checkUserRoom() {
        return $.ajax({
            url: checkUserRoom_url,
            success: function (data) {
                if (data.result == 'success') {
                    alert("You are alreay in room:" + data.data.room)
                    return false
                } else {
                    console.log("true")
                    return true
                }
            }
        });
    }


    // Join room from "Rooms in platform"
    $('#join-room-in-platform button').on('click', function () {
        var $this = $(this)
        var room = $this.data('room');
        var room_url = $this.data('url');
        var is_public = $this.data('public');
        console.log("Join:", room_url, is_public)
        if (is_public == false) {
            // active modal to input password to enter room
            $('.ui.modal.room.join').modal({blurring: true}).modal('show');
            $('#join-room-with-pass').attr({"action": room_url, "data-room": room})
        } else {
            joinRoomWithoutPass(room_url)
        }
    });


    // Join room from "Search room" including and mobile side
    $('#search-room, #search-room-mobile').submit(function (event) {
        console.log("search-room", $(this))
        event.preventDefault();
        $.ajax({
            url: $(this).attr('action'),
            type: 'POST',
            data: $(this).serializeArray(),
            success: function (data) {
                console.log(data)
                if (data.result == "success") {
                    if (data.data.is_public == true) {
                        $('.ui.modal.room.join').modal({blurring: true}).modal('show');
                        $('#join-room-with-pass').attr({"action": data.data.join_url, "data-room": data.data.room})
                    } else {
                        joinRoomWithoutPass(data.data.join_url)
                    }
                } else {
                    // message show on the bottom of personal card
                    $(".message.platform").html('<i class=\"close icon\"></i>' + data.message);
                    $(".message.platform").removeClass("hidden");
                }
            }
        })
    });


    // Open the modal of room created
    $('#show-create-room-modal, #show-create-room-modal-mobile').on('click', function () {
        //empty all field in form
        $('#create-room-textarea').val('');
        $('#create-room-pass-textarea').val('');
        //empty message
        $("#create-room-message").text('');
        $("#create-room-message").addClass("hidden");
        //activate creat room modal
        $('.ui.modal.room.create').modal({blurring: true}).modal('show');
    });


    // platform page sticky
    $('.ui.sticky').sticky({context: '#example1'});

    // create sidebar and attach to menu open
    $('.ui.sidebar').sidebar('attach events', '.platform-button');


    // Join room with password. It's only way to enter room which has password.
    $('#join-room-with-pass').on('submit', function (event) {
        event.preventDefault();
        $.ajax({
            url: $('#join-room-with-pass').attr('action'),
            type: 'POST',
            data: $('#join-room-with-pass').serializeArray(),
            success: function (data) {
                if (data.result == "success") {
                    window.location.href = data.data.room_url;
                } else {
                    $('#join-room-pass-textarea').val('')
                    console.log(data)
                    // message show on the bottom of  inputing room password modal
                    $("#join-room-with-pass-message").html("<i class=\"exclamation icon\"></i>" + data.message);
                    $("#join-room-with-pass-message").removeClass("hidden");
                }
            }
        })
    })


})
