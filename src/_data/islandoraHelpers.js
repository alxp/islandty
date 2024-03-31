const fs = require('fs');
module.exports = {
    /**
       * Finds the parent item from the current item
       *
       * @param {Array} items A list of islandora items
       * @param {Object} item The current item we want the parent of
       * @returns {Array} The resulting parent item. 
       */
    getParentContent(items, item) {
        let filteredItems = items.filter(x => x.id == item.parent_id);

        // Lastly, get just the first
        filteredItems = filteredItems[0];

        return filteredItems;
    },

    /**
       * Finds the children items from the current item
       *
       * @param {Array} items A list of islandora items
       * @param {Object} item The current item we want the children of
       * @returns {Array} The resulting children items. 
       */
    getChildContent(items, item) {
        let filteredItems = items.filter(x => x.parent_id == item.id);

        return filteredItems;
    },

    /**
     * Finds the normalized content model associated with a string
     * which may be the natural language or URI version of an 
     * Islandora 2 Model.
     * 
     * @param {String} value A raw value representing a model
     * @returns {String} Name of the layout file.
     */
    getLayoutForContentModel(value) {
        var slugify = require('slugify');
        let fileSlug = slugify(value);
        var layoutFile = `partials/${fileSlug}.html`;
        if(fs.existsSync(`src/_includes/${layoutFile}`)) {
            return layoutFile;
        }else{
            return "partials/default-item.html";
        }



    }

}