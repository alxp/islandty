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
    }




}