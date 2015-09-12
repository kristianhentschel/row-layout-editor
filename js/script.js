$("document").ready(function($) {
/******************************
 * Row Model, stores rows (duh)
 ******************************/
    var RowModel = function() {
        this.rows = [];
    }

    RowModel.prototype.get = function(index) {
        if (this.rows.length < index) {
            return this.rows[i];
        } else {
            return undefined;
        }
    }

    /**
     * Inserts a new row before the n'th row, and populates it with the given array of images.
     */
    RowModel.prototype.create = function(beforeIndex, images) {
        var newRow = {
            images: images.splice()
        }
        this.rows.splice(beforeIndex, 0, newRow);
    }

    /**
     * Removes the n'th row from the model.
     */
    RowModel.prototype.remove = function(rowIndex) {
        this.rows.splice(rowIndex, 1);
    }

    /**
     * Removes from the n'th row the m'th image
     */
    RowModel.prototype.removeImage = function(rowIndex, imageIndex) {
        var row = this.get(rowIndex);
        row.images.splice(imageIndex, 1);
        if (row.images.length == 0)
            this.remove(rowIndex);
    }

    /**
     * Inserts into the n'th row, the given image at position m.
     */
    RowModel.prototype.insertImage = function(rowIndex, image, beforeIndex) {
        var row = this.get(rowIndex);
        row.images.splice(beforeIndex, 0, image);
    }

    RowModel.prototype.getNumRows = function() {
        return this.rows.length;
    }


/************
 * Controller
 ************/
    var Controller = function(model, view) {
        var self = this;

        self.model = model;
        self.view = view;

        self.view.bind('removeImage', function(rowIndex, imageIndex) {
            self._removeImage(rowIndex, imageIndex);
        })

        self.view.bind('addImages', function(images) {
            self._addImages(images);
        });

        self.view.bind('moveImageToRow', function(fromRow, fromIndex, toRow, toIndex){
            var image = self._removeImage(fromRow, fromIndex);
            self._insertImage(toRow, toIndex, image);
        });

        self.view.bind('moveImageToNewRow', function(fromRow, fromIndex, toBeforeRow){
            var image = self.removeImage(fromRow, fromIndex);
            self._addRow(toBeforeRow, [image]);
        });
    }


    /**
     * Removes the image from the given row, and deletes the row if it becomes empty as a result.
     */
    Controller.prototype._removeImage = function(rowIndex, imageIndex) {
        this.model.removeImage(rowIndex, imageIndex);
        var row = this.model.get(rowIndex);

        if (row.images.length == 0) {
            this.model.remove(rowIndex);
            this.view.render('removeRow', {index: rowIndex});
        } else {
            this.view.render('updateRow', {index: rowIndex, images: row.images});
        }
    }

    /**
     * distributes a large number of images among new rows.
     */
    Controller.prototype._addImages = function(images) {
        console.log("Controller._addImages", images);
        var imagesPerRow = 4;

        while(images.length > 0) {
            this._addRow(this.model.getNumRows(), images.splice(0, imagesPerRow));
        }
    }

    /**
     * adds a row at the specified index, containing the given images.
     */
    Controller.prototype._addRow = function(beforeIndex, images) {
        console.log("Controller._addRow", beforeIndex);
        this.model.create(beforeIndex, images);
        this.view.render('insertRow', {index: beforeIndex, images: images});
    }

/**************
 * Layout View
 **************/
    var LayoutView = function() {
        this.$el = $("#temp-loaded-images");
        this.$rows = [];
        this.handlers = [];

        this.initialize();
    }
    
    /**
     * creates the scaffolding, removes all state, and registers browser events.
     */
    LayoutView.prototype.initialize = function() {
        var self = this;
        self.$el.empty();
        
        var dropbox = document.getElementById("controls");
        dropbox.addEventListener("dragenter", self._dragEnter, false);
        dropbox.addEventListener("dragover", self._dragOver, false);
        dropbox.addEventListener("drop", function(e){self._drop(e, self);}, false);
    }

    LayoutView.prototype.render = function(action, data) {
        console.log("LayoutView.render", action, data);
        switch(action) {
            case 'insertRow':
                this.insertRow(data.index, data.images);
                break;
            case 'removeRow':
                this.removeRow(data.index);
                break;
            case 'updateRow':
                this.updateRow(data.index);
                break;
        }
    }

    /**
     * creates the dom elements and registers event handlers for the new row.
     */
    LayoutView.prototype.insertRow = function(index, images) {
        console.log("LayoutView.insertRow", index);
        var $row = $("<li>").text("Row "+index);

        if (this.$rows.length <= index) {
            this.$el.append($row);
        } else {
            this.$el.children().eq(index).before($row);
        }

        this.$rows.splice(index, 0, $row);

        this.updateRow(index, images);
    }

    /**
     * deletes the row's dom element
     */
    LayoutView.prototype.removeRow = function(index) {
        this.$rows.splice(index, 1);
        this.$el.children().eq(index).remove();
    }

    /**
     * clears the row, and adds all the images again to correct for changes to order or membership.
     */
    LayoutView.prototype.updateRow = function(index, images) {
        // replace images in the row
        var $row = this.$rows[index];

        //$row.empty();

        for(var i = 0; i < images.length; i++) {
            $row.append(images[i]);
        }

        this._rebalanceRow(index);
    }

    /**
     * calculates the css image widths, heights, and positions
     */
    LayoutView.prototype._rebalanceRow = function(index) {

    }

    LayoutView.prototype.bind = function(name, handler) {
        this.handlers[name] = handler;
    }

    LayoutView.prototype.drop = function(e, self) {
        console.log(e);
        var dt = e.dataTransfer;
        var files = dt.files;
        var images = [];
        var still_loading = files.length;

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var $img = $("<img>").data("file-name", file.name);
            images.push($img);

            $img.bind("load", function(e) {
                still_loading--;
                if (still_loading == 0)
                    self.handlers['addImages'](images);
            });

            $img.attr("src", window.URL.createObjectURL(file));

        }
    }

    LayoutView.prototype._drop = function(e, self) {
        e.preventDefault();
        e.stopPropagation();
        self.drop(e, self);
    }

    LayoutView.prototype._dragEnter = function(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    LayoutView.prototype._dragOver = function(e) {
        e.preventDefault();
        e.stopPropagation();
    }

/*************
 * Application
 *************/

var m = new RowModel();
var v = new LayoutView();
var c = new Controller(m, v);

});
