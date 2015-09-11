$("document").ready(function($) {
    var drop = function(e) {
        var dt = e.dataTransfer;
        var files = dt.files;

        for (var i = 0; i < files.length; i++) {
            loadImage(files[i]);
        }
        return false;
    }

    var loadImage = function(file) {
        var li = $("<li>");
        var img = $("<img>").attr("alt", file.name).attr("height", 100);
        li.append(img);
        li.append(file.name);
        $("#temp-loaded-images").append(li);

        var reader = new FileReader();
        reader.onload = function(e) { console.log(e); img.attr("src", e.target.result); };
        reader.readAsDataURL(file);

    }

    var dropbox = document.getElementById("controls");

    dropbox.addEventListener("dragenter", function(e) {
        e.stopPropagation();
        e.preventDefault();
    }, false);

    dropbox.addEventListener("dragover", function(e) {
        e.stopPropagation();
        e.preventDefault();
    }, false);

    dropbox.addEventListener("drop", function(e) {
        e.stopPropagation();
        e.preventDefault();
        drop(e);
    }, false);
});
