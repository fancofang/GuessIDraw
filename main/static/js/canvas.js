var canvas=document.getElementById("myCanvas");
var ctx=canvas.getContext("2d");

//resizing
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

//variable
var status ='painting';
var stop =true;
//pencil thickness
var pencilThickness = 5;
var pencilColor = "black";
//eraser thickness
var eraser = 15;
var senddata = {
    x:0,
    y:0,
    drawerheight:canvas.height,
    drawerwidth:canvas.width,
    pencilThickness:pencilThickness,
    pencilColor:pencilColor,
    eraser:eraser,
    status:'painting',
    clean:false,
    stop: true,
}

function stopPropagation(evt) {
    if (typeof evt.stopPropagation == "function") {
        evt.stopPropagation();
    } else {
        evt.cancelBubble = true;
    }
}

function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    var x = (event.clientX - rect.left) * (canvas.width / rect.width);
    var y = (event.clientY - rect.top) * (canvas.height / rect.height);
    senddata.x = x;
    senddata.y = y;
    return {'x':x,'y':y};
};

function GuestTransform(canvas,e) {
    var tx = e.x/e.drawerwidth*canvas.width;
    var ty = e.y/e.drawerheight*canvas.height;
    var tpencil = e.pencilThickness/e.drawerwidth * canvas.width;
    var teraser = e.eraser/e.drawerwidth *canvas.width;
    return {'x':tx,'y':ty,'pencilThickness':tpencil,'eraser':teraser};
};

function start(e){
    stop = false;
    senddata.stop = false;
    senddata.clean = false;
    docanvas(e);
};

function end(e){
    stop = true;
    senddata.stop = true;
    ctx.beginPath();
};

function docanvas(e){
    if(stop) return;
    if (status == 'painting'){
        ctx.lineWidth = pencilThickness;
        ctx.strokeStyle= pencilColor;
    }
    else{
        ctx.lineWidth = eraser;
        ctx.strokeStyle="white";
    }
    ctx.lineCap = 'round';
    mousecoord = getMousePos(canvas, e);
    ctx.lineTo(mousecoord.x, mousecoord.y);
    ctx.stroke();
};

function handleStart(evt) {
    evt.preventDefault();
    stop = false;
    senddata.stop = false;
    senddata.clean = false;
    handleMove(evt);
}

function handleEnd(evt) {
    evt.preventDefault();
    stop = true;
    senddata.stop = true;
    ctx.beginPath();
}

function handleMove(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;
    if(stop) return;
    if (status == 'painting'){
        ctx.lineWidth = pencilThickness;
        ctx.strokeStyle= pencilColor;
    }
    else{
        ctx.lineWidth = eraser;
        ctx.strokeStyle="white";
    }
    ctx.lineCap = 'round';
    mousecoord = getMousePos(canvas, touches[0]);
    ctx.lineTo(mousecoord.x, mousecoord.y);
    ctx.stroke();
}

function showoncanvas(e){
    mousecoord = GuestTransform(canvas, e);
    if (e.status == 'painting'){
        ctx.lineWidth = mousecoord.pencilThickness;
        ctx.strokeStyle= e.pencilColor;
    }
    else{
        ctx.lineWidth = mousecoord.eraser;
        ctx.strokeStyle="white";
    }
    ctx.lineCap = 'round';
    ctx.lineTo(mousecoord.x, mousecoord.y);
    ctx.stroke();
    if(e.stop) {
        ctx.beginPath();
    }
    if(e.clean){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
};

function cleancanvas(){
    senddata.clean = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};


function Initcanvas() {
    if (drawer.getVar == current_user_name) {
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mouseup', end);
        canvas.addEventListener('mousemove', docanvas);

        canvas.addEventListener("touchstart", handleStart);
        canvas.addEventListener("touchend", handleEnd);
        canvas.addEventListener("touchmove", handleMove);

        $('.canvas-container').on('click', ".pencil.alternate.icon", function () {
            $(".pencil-menu").toggleClass('invisible');
            $(".canvastool-pencil").addClass("active");
            $(".canvastool-eraser").removeClass("active");
            senddata.status = 'painting';
        });

        $('.canvas-container').on('click', ".eraser.icon", function () {
            $(".eraser-menu").toggle();
            $(".canvastool-pencil").removeClass("active");
            $(".canvastool-eraser").addClass("active");
            senddata.status = 'cleaning';
        });

    } else {
        $(".canvastool-pencil").addClass('invisible');
        $(".canvastool-eraser").addClass('invisible');
        $(".canvastool-trash").addClass('invisible');
    }
};


//active canvas tool
$('.canvas-container').on('click',"#canvas-tool>div",function(){
    $(this).addClass('active');
    $(this).siblings().removeClass('active');
    if($(".canvastool-pencil").hasClass("active")){
        status = 'painting';
    };
    if($(".canvastool-eraser").hasClass("active")){
        status = 'cleaning';
    }
    senddata.status = status
});
// $("#canvas-tool>div").click(function(){
//     $(this).addClass('active');
//     $(this).siblings().removeClass('active');
//     if($(".canvastool-pencil").hasClass("active")){
//         status = 'painting';
//     };
//     if($(".canvastool-eraser").hasClass("active")){
//         status = 'cleaning';
//     }
//     senddata.status = status
// });

//active pencil color
$('.canvas-container').on('click',"#color-group li",function(){
    $(this).addClass('active');
    $(this).siblings().removeClass('active');
    pencilColor = this.style.backgroundColor;
    senddata.pencilColor = pencilColor
});

//change pencil thickness
$('.canvas-container').on('change',"#pencil-range",function(){
    pencilThickness = this.value;
    senddata.pencilThickness = pencilThickness
});

//change eraser thickness
$('.canvas-container').on('change',"#eraser-range",function(){
    eraser= this.value;
    senddata.eraser = eraser;
});

//reset canvas
$('.canvas-container').on('click',"#reSetCanvas",function(){
    cleancanvas();
});

//show  pencil tool
$(".canvastool-pencil").mouseenter(function(){
    $(".pencil-menu").removeClass('invisible');
});
$(".canvastool-pencil").mouseleave(function(){
    $(".pencil-menu").addClass('invisible');
});

//show  eraser tool
$(".canvastool-eraser").mouseenter(function(){
    $(".eraser-menu").removeClass('invisible');
});
$(".canvastool-eraser").mouseleave(function(){
    $(".eraser-menu").addClass('invisible');
});

//show rank window
$(".canvastool-rank").click(function(){
    $("#rank").toggle();
    display = $("#rank")[0].style.display;
    if(display == "none"){
        $(".canvastool-rank").removeClass('active');
    }
    else{
        $(".canvastool-rank").addClass('active');
    }
});

//show answer window
$(".canvastool-answer").click(function(){
    $("#answer").toggle();
    display = $("#answer")[0].style.display;
    if(display == "none"){
        $(".canvastool-answer").removeClass('active');
    }
    else{
        $(".canvastool-answer").addClass('active');
    }
});


$(document).ready(function () {
    //EventListen if you are drawer , you can draw, otherwise not.
    Initcanvas();
});
