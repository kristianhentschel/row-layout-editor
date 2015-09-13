$("document").ready(function($) {
/******************************
 * Row Model, stores rows (duh)
 ******************************/
    var RowModel = function() {
        this.rows = [];
    }

    RowModel.prototype.get = function(index) {
        console.log("RowModel.get", index);
        if (index < this.rows.length) {
            return this.rows[index];
        } else {
            return undefined;
        }
    }

    /**
     * Inserts a new row before the n'th row, and populates it with the given array of images.
     */
    RowModel.prototype.create = function(beforeIndex, images) {
        var newRow = {
            images: images.slice()
        }
        console.log("create", newRow);
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
        console.log("RowModel.removeImage", rowIndex, imageIndex);
        var row = this.get(rowIndex);
        var image = row.images.splice(imageIndex, 1)[0];
        return image;
    }

    /**
     * Inserts into the n'th row, the given image at position m.
     */
    RowModel.prototype.insertImage = function(rowIndex, beforeIndex, image) {
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
            var image = self._removeImage(fromRow, fromIndex);
            self._addRow(toBeforeRow, [image]);
        });
    }


    /**
     * Removes the image from the given row, and deletes the row if it becomes empty as a result.
     */
    Controller.prototype._removeImage = function(rowIndex, imageIndex) {
        console.log("Controller._removeImage", rowIndex, imageIndex);
        var image = this.model.removeImage(rowIndex, imageIndex);
        var row = this.model.get(rowIndex);
        console.log("after removal:", row);

        /* TODO: changing the indices of subsequent rows by deleting the empty row causes error in the
         * moveImage functions, which depend on unchanged indices.
         * Example: Move the only image in a row to any row after it.
         */
        if (row.images.length == 0) {
            this.model.remove(rowIndex);
            this.view.render('removeRow', {index: rowIndex});
        } else {
            this.view.render('updateRow', {index: rowIndex, images: row.images});
        }

        return image;
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

    Controller.prototype._insertImage = function(toRow, toIndex, image) {
        console.log("Controller._insertImage", toRow, toIndex, image);
        this.model.insertImage(toRow, toIndex, image);
        var row = this.model.get(toRow);
        this.view.render('updateRow', {index:toRow, images:row.images});
    }

/**************
 * Layout View
 **************/
    var LayoutView = function() {
        this.$el = $("#layout-view");
        this.$rows = [];
        this.handlers = [];

        this.image_margin = 10;

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
                this.updateRow(data.index, data.images);
                break;
        }
    }

    /**
     * creates the dom elements and registers event handlers for the new row.
     */
    LayoutView.prototype.insertRow = function(index, images) {
        console.log("LayoutView.insertRow", index);
        var $row = $("<div>")
            .addClass("row")
            .attr("title", "Row "+index);

        if (this.$rows.length <= index) {
            this.$el.append($row);
        } else {
            this.$el.children(".row").eq(index).before($row);
        }

        this.$rows.splice(index, 0, $row);

        this._syncRowIndices();
        this.updateRow(index, images);
    }

    /**
     * deletes the row's dom element
     */
    LayoutView.prototype.removeRow = function(index) {
        this.$rows.splice(index, 1);
        this.$el.children(".row").eq(index).remove();
        this._syncRowIndices();
    }

    /**
     * clears the row, and adds all the images again to correct for changes to order or membership.
     */
    LayoutView.prototype.updateRow = function(index, images) {
        console.log("LayoutView.updateRow", index, images);
        var self = this;
        var $row = this.$rows[index];

        $row.empty();

        for(var i = 0; i < images.length; i++) {
            var $img = $(images[i]);
            $img.bind('click',
                function(self, imageIndex){
                    return function(e) {
                        var rowIndex = $(e.target).parent().data("index");
                        self.handlers['removeImage'](rowIndex, imageIndex);
                    }
                }(self, i));
            $img.attr("draggable", true).bind("dragstart",
                function(self, imageIndex) {
                    return function(e) {
                        var rowIndex = $(e.target).parent().data("index");

                        var dt = e.originalEvent.dataTransfer;
                        dt.setData("text/plain", rowIndex+" "+imageIndex);
                        dt.effectAllowed = "move";

                        self._dragStart(self);
                    }
                }(self, i)
            ).bind("dragend", function(e) {
                self._dragEnd(self);
            });
            $row.append($img);
        }

        this._rebalanceChildren($row, this.image_margin);
    }

    /**
     * insert spacers as drop targets.
     */
    LayoutView.prototype._dragStart = function(self) {
        console.log("LayoutView._dragStart");
        function makeSpacer(i, j) {
            var $spacer = $("<div>")
                .addClass("drop-space")
                .bind("drop", function(e){
                    var dt = e.originalEvent.dataTransfer;
                    console.log(dt.getData("text/plain"), "dropped into", i, j);

                    var pos = dt.getData("text/plain").split(" ");
                    var fromRow = pos[0];
                    var fromIndex = pos[1];

                    var toRow = i;
                    var toIndex = j;

                    if (toIndex >= 0) {
                        self.handlers['moveImageToRow'](fromRow, fromIndex, toRow, toIndex);
                    } else {
                        self.handlers['moveImageToNewRow'](fromRow, fromIndex, toRow);
                    }

                    e.originalEvent.preventDefault();
                    return false;
                })
                .bind("dragover dragenter", function(e){
                    $(e.target).addClass("drop-hover");
                    e.originalEvent.preventDefault();
                })
                .bind("dragleave", function(e){
                    $(e.target).removeClass("drop-hover");
                    e.originalEvent.preventDefault();
                });
            if (j < 0) {
                $spacer.addClass("spacer-row");
            }
            return $spacer;
        }

        self.$el.children(".row").each(function(i, row){
            // insert spacers before each col and at the end of the row.
            $(row).children().each(function(j, col) {
                $(col).before(makeSpacer(i, j));
            });
            $(row).append(makeSpacer(i, $(row).children().length));
            self._rebalanceChildren($(row), self.image_margin);
        });
            
        // insert a spacer before each row and after the last row
        var numRows = self.$rows.length;
        self.$el.children(".row").each(function(i, row){
            $(row).before(makeSpacer(i, -1));
        });
        self.$el.append(makeSpacer(numRows, -1));
        self.$el.addClass("enable-spacers");
    }

    LayoutView.prototype._dragEnd = function(self) {
        console.log("LayoutView._dragEnd");
        self.$el.find(".drop-space").remove();
        self.$el.removeClass("enable-spacers");
        self.$el.children(".row").each(function(i, row) {
            self._rebalanceChildren($(row), self.image_margin);
        });
    }

    /**
     * calculates the css element widths, heights, and positions, based on parent element width
     * and the given pixel margin to maintain between the child elements
     */
    LayoutView.prototype._rebalanceChildren = function($el, margin) {
        console.log('_rebalanceChildren', $el);

        var total_width = $el.width();
        var num_children = $el.children("img").length;
        var available_width = total_width - (num_children + 1) * margin;

        var widths = [];
        var heights = [];
        var max_height = 0;

        $el.children("img").each(function(i, col) {
            $col = $(col);
            var w = $col.width();
            var h = $col.height();
            max_height = Math.max(max_height, h);
            widths.push(w);
            heights.push(h);
        });

        var content_width = 0;

        for(var i = 0; i < num_children; i++) {
            var scaled_width = max_height * widths[i] / heights[i];
            content_width += scaled_width;
        }

        var scaled_height = available_width * max_height / content_width;
        var used_width = 0;

        $el.height(scaled_height + "px");

        $el.children("img").each(function(i, col) {
            var $col = $(col);
            var scaled_width = widths[i] / heights[i] * scaled_height;
            var left = used_width + (i + 1) * margin;

            $col.css('left', left + "px")
                .css('width', scaled_width + "px")
                .css('height', scaled_height + "px");

            used_width += scaled_width;
        });

        // adjust position of spacers if any
        used_width = 0;
        $el.children().each(function(i, col) {
            var $col = $(col);
            if($col.hasClass("drop-space")) {
                $col.css("left", used_width + "px");
                used_width += margin;
            } else {
                used_width += parseFloat($col.css("width"));
            }
        });
    }

    LayoutView.prototype._syncRowIndices = function() {
        for (var i = 0; i < this.$rows.length; i++) {
            this.$rows[i].data("index", i);
        }
    }

    LayoutView.prototype.bind = function(name, handler) {
        this.handlers[name] = handler;
    }

    LayoutView.prototype.drop = function(e, self) {
        var dt = e.dataTransfer;
        var files = dt.files;
        var images = [];
        var still_loading = files.length;

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var img = document.createElement("img");
            images.push(img);

            img.addEventListener("load", function(e) {
                still_loading--;
                if (still_loading == 0)
                    self.handlers['addImages'](images);
            });

            img.src = window.URL.createObjectURL(file);

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

console.log(c);

});
