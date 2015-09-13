$("document").ready(function($) {
/*****************************************************
 * Model, stores data about images, and the row layout.
 *****************************************************/
    var Model = function() {
        this.lastRowId = 0;
        this.lastImageId = 0;
        this.images = [];
        this.rows = [];
        this.rowOrder = [];
    }

    /**
     * look up a row by Id
     */
    Model.prototype.getRow = function(rowId) {
        console.log("Model.get", rowId);
        return this.rows[rowId];
    }

    /**
     * returns the current index of the given row, returning -1 if the index is not there.
     */
    Model.prototype._findRowIndex = function(rowId) {
        for(var i = 0; i < this.rowOrder.length; i++) {
            if(this.rowOrder[i] == rowId) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Inserts a new row before the given row.
     */
    Model.prototype.createRow = function(imageIds, beforeRowId) {
        var newRow = {
            rowId: this.lastRowId++,
            images: []
        }

        // insert into row-order in correct position (at end or as specified)
        rowIndex = this.rowOrder.length;
        if (beforeRowId !== undefined)
            rowIndex = this._findRowIndex(beforeRowId);
        this.rowOrder.splice(rowIndex, 0, newRow.rowId);

        // insert into row-map
        this.rows[newRow.rowId] = newRow;

        // add the images to the row
        if (imageIds !== undefined) {
            for(var i = 0; i < imageIds.length; i++) {
                this.insertImage(rowId, imageIds[i]);
            }
        }

        return newRow.rowId;
    }

    /**
     * Creates a new image object
     */
    Model.prototype.createImage = function(image) {
        var newImage = {
            imageId: this.lastImageId++,
            src: image.src,
            height: image.height,
            width: image.width,
            alt: image.alt,
            fileName: image.fileName
        }
        this.images[newImage.imageId] = newImage;
        return newImage.imageId;
    }

    /**
     * Removes the given row from the layout
     */
    Model.prototype.removeRow = function(rowId) {
        this.rowOrder.splice(this._findRowIndex(rowId), 1);
    }

    /**
     * finds the position in a row of the given image id.
     */
    Model.prototype._findImageIndex = function(rowId, imageId) {
        var row = this.getRow(rowId);
        for(var i = 0; i < row.images.length; i++) {
            if(row.images[i].imageId == imageId) {
                return i;
            }
        }
        return undefined;
    }

    /**
     * Removes the given image from the given row.
     */
    Model.prototype.removeImage = function(rowId, imageId) {
        console.log("Model.removeImage", rowId, imageId);
        var row = this.getRow(rowId);
        row.images.splice(this._findImageIndex(rowId, imageId), 1);
    }

    /**
     * Inserts into the given row, before a given image id, this image id.
     */
    Model.prototype.insertImage = function(rowId, imageId, beforeImageId) {
        var row = this.getRow(rowId);
        var index = row.images.length;

        if (beforeImageId !== undefined)
            index = this._findImageIndex(rowId, imageId);

        row.images.splice(index, 0, this.getImage(imageId));
    }

    /**
     * return the number of rows currently in the layout
     */
    Model.prototype.getNumRows = function() {
        return this.rowOrder.length;
    }

    Model.prototype.getRowOrder = function() {
        return this.rowOrder.slice();
    }

    Model.prototype.getImage = function(imageId) {
        return this.images[imageId];
    }
/************
 * Controller
 ************/
    var Controller = function(model, view) {
        var self = this;

        self.model = model;
        self.view = view;

        self.view.bind('removeImage', function(rowId, imageId) {
            self._removeImage(rowId, imageId);
        })

        self.view.bind('addImages', function(images) {
            self.addImages(images);
        });

        //self.view.bind('moveImageToRow', function(fromRow, fromIndex, toRow, toIndex){
        //    var image = self._removeImage(fromRow, fromIndex);
        //    self._insertImage(toRow, toIndex, image);
        //});

        //self.view.bind('moveImageToNewRow', function(fromRow, fromIndex, toBeforeRow){
        //    var image = self._removeImage(fromRow, fromIndex);
        //    self._addRow(toBeforeRow, [image]);
        //});
    }


    /**
     * Removes the image from the given row, and deletes the row if it becomes empty as a result.
     */
    Controller.prototype._removeImage = function(rowId, imageId) {
        console.log("Controller._removeImage", rowId, imageId);
        var row = this.model.getRow(rowId);
        this.model.removeImage(rowId, imageId);
        this.view.render('updateRow', {rowId: rowId, images:row.images});

        if (row.images.length == 0) {
            this.model.removeRow(rowId);
            this.view.render('updateRowOrder', {rowOrder: this.model.getRowOrder()});
        }
    }

    /**
     * creates newly loaded images and distributes them into new rows.
     */
    Controller.prototype.addImages = function(images) {
        console.log("Controller.addImages", images);

        var imagesPerRow = 4;
        var used = 0;
        var rowId;
        while(images.length > 0) {
            // create a row in the model
            if (used % imagesPerRow == 0)
                rowId = this.model.createRow();

            // take the first image from the argument list, and increment the number of images used.
            var image = images.shift();
            used++;

            // Create the image object in the model
            var imageId = this.model.createImage(image);

            // Insert the image id into the row, and tell the view to update this row.
            this.insertImage(rowId, imageId);
        }
    }

    Controller.prototype.insertImage = function(toRowId, imageId, beforeImageId) {
        console.log("Controller._insertImage", toRowId, imageId, beforeImageId);

        this.model.insertImage(toRowId, imageId, beforeImageId);
        var row = this.model.getRow(toRowId);

        this.view.render('updateRowOrder', {rowOrder: this.model.getRowOrder()});
        this.view.render('updateRow', {rowId: toRowId, images: row.images});
    }

/**************
 * Layout View
 **************/
    var LayoutView = function() {
        this.$el = $("#layout-view");
        this.imgs = []; // DOMElements by objectUrl
        this.rows = []; // DOMElements by model rowId
        this.orderedRows = []; // DOMElements in order

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
        
        var dropbox = document;
        dropbox.addEventListener("dragenter", self._fileDragOver, false);
        dropbox.addEventListener("dragover", self._fileDragOver, false);
        dropbox.addEventListener("drop", function(e){self._fileDrop(e, self);}, false);
    }

    LayoutView.prototype.render = function(action, data) {
        console.log("LayoutView.render", action, data);
        switch(action) {
            case 'updateRowOrder':
                this.updateRowOrder(data.rowOrder);
                break;
            case 'updateRow':
                this.updateRow(data.rowId, data.images);
                break;
        }
    }

    /**
     * creates new, empty rows, changes the order to match, and removes deleted rows from view,
     * making the rows visible in the document in the specified order.
     */
    LayoutView.prototype.updateRowOrder = function(rowIds) {
        console.log("LayoutView.updateRowOrder", rowIds);
        this.orderedRows = [];
        this.$el.empty();
        for(var i = 0; i < rowIds.length; i++) {
            var rowId = rowIds[i];
            var row = this.rows[rowId] || this.createRow(rowId);

            this.orderedRows.push[row];
            this.$el.append(row);
        }
    }

    /**
     * creates a new empty row but does not display it.
     */
    LayoutView.prototype.createRow = function (rowId) {
        var row = document.createElement("div");
        row.className = "row";
        this.rows[rowId] = row;
        return row;
    }

    /**
     * clears the row, and adds all the images again to correct for changes to order or membership.
     */
    LayoutView.prototype.updateRow = function(rowId, images) {
        console.log("LayoutView.updateRow", rowId, images);
        var self = this;
        var row = this.rows[rowId];

        $(row).empty();

        for(var i = 0; i < images.length; i++) {
            var img = self.getImg(images[i]);
            img.dataset.rowId = rowId;
            
            // I do not use jQuery events here, because they get lost when the element becomes
            // detached from the DOM, as in updateRowOrder.
            // TODO this appraoch adds duplicate listeners...
            //.attr("draggable", true)
            //.bind("dragstart",
            //    function(self, imageIndex) {
            //        return function(e) {
            //            var rowIndex = $(e.target).parent().data("index");

            //            var dt = e.originalEvent.dataTransfer;
            //            dt.setData("text/plain", rowIndex+" "+imageIndex);
            //            dt.effectAllowed = "move";

            //            self._dragStart(self);
            //        }
            //    }(self, i))
            $(row).append(img);
        }

        this._rebalanceChildren($(row), this.image_margin);
    }

    LayoutView.prototype.getImg = function(image) {
        return this.imgs[image.src] || this.createImg(image);
    }

    LayoutView.prototype.createImg = function(image) {
        var self = this;
        var img = document.createElement("img");
        img.src = image.src;
        this.imgs[image.src] = img;
        img.dataset.imageId = image.imageId;
        img.addEventListener('click', function(e) { self._imageClickHandler(e, self); }, false);
        return img;
    }

    LayoutView.prototype._imageClickHandler = function(e, self) {
        var rowId = e.target.dataset.rowId;
        var imageId = e.target.dataset.imageId;
        self.handlers['removeImage'](rowId, imageId);
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
        var available_width = total_width - (num_children - 1) * margin;

        var widths = [];
        var heights = [];
        var max_height = 0;

        $el.children("img").each(function(i, img) {
            var w = img.width;
            var h = img.height;
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
    }

    LayoutView.prototype.bind = function(name, handler) {
        this.handlers[name] = handler;
    }


    LayoutView.prototype._fileDrop = function(e, self) {
        e.preventDefault();
        e.stopPropagation();

        var dt = e.dataTransfer;
        var files = dt.files;
        var still_loading = files.length;
        var allowedTypes = /image\/.*/;
        var images = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if(allowedTypes.test(file.type)) {
                var img = document.createElement("img");

                img.addEventListener("load", function(e) {
                    still_loading--;
                    console.log("loaded", images.length - still_loading, "of", images.length);
                    if (still_loading == 0)
                        self.handlers['addImages'](images);
                });

                img.src = window.URL.createObjectURL(file);
                img.alt = file.name.split(".")[0] || file.name;
                images.push({
                    fileName: file.name,
                    src: img.src,
                    alt: img.alt,
                    width: img.width,
                    height: img.height
                });
            } else {
                still_loading--;
            }
        }
    }

    LayoutView.prototype._fileDragOver = function(e) {
        // Accept only drag-and-drop events that are carrying files.
        var dt = e.dataTransfer;
        if (dt.files.length > 0) {
            dt.dropEffect = "link";
            e.preventDefault();
            e.stopPropagation();
        }
    }

/*************
 * Application
 *************/

var m = new Model();
var v = new LayoutView();
var c = new Controller(m, v);

console.log(c);

});
