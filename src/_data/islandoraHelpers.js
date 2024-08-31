const fs = require('fs');
const path = require('path');
const SaxonJS = require('saxon-js');
require('dotenv').config();


module.exports = {

    generateIiifMetadata(book, bookPath) {
        const writeYamlFile = require('write-yaml-file');
        info = {
            label: book.title,
            behavior: 'paged',
            description: book.field_description,
            metadata: {
                license: book.field_rights
            }
        };
        writeYamlFile.sync(path.join(bookPath, 'info.yml'), info);
    },

    /**
       * Finds the parent item from the current item
       *
       * @param {Array} items A list of islandora items
       * @param {Object} item The current item we want the parent of
       * @returns {Array} The resulting parent item.
       */
    getParentContent(items, item_id) {
        let filteredItems = items.filter(x => x.id == item_id);

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
    getChildContent(items, item_id) {
        let filteredItems = items.filter(x => x.parent_id == item_id);

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
        if (fs.existsSync(`src/_includes/${layoutFile}`)) {
            return layoutFile;
        } else {
            return "partials/default-item.html";
        }

    },

    /**
     * Return the location of a IIIF Manifest for the given item.
     *
     * @param {*} item
     * @returns
     *    The path of the manifest.
     */
    getIiifManifestForItem(file) {
        let manifest_url = '/' + path.join('images', path.dirname(file), 'iiif/index.json');
        return manifest_url;
    },

    /**
     * Get all content items with the given content model (human readable name).
     *
     * @param {*} items
     * @param {*} model
     * @returns
     */
    itemsWithContentModel(items, model) {
        let filteredItems = items.filter(x => x.field_model == model);

        return filteredItems;
    },

    /**
     * Transform the data XML file of each object by the Index XSLT.
     */
    searchIndex(article) {
        const ModsFile = article.data.ModsFile;
        if (!ModsFile) {
            console.warn('Failed to extract excerpt: Document has no property "ModsFile".');
            return null;
        }

	    const IndexXSLTFile = article.data.IndexXSLT;
        if (!IndexXSLTFile) {
            console.error('Failed to extract excerpt: Document has no property "IndexXSLT".');
            return null;
        }

       return module.exports.processXSLT(ModsFile, IndexXSLTFile);
    },

    /**
     * Transform the XSLT file into HTML by a given XSLT.
     */
    processXSLT(xml, stylesheet ) {

        try {
            const output = SaxonJS.transform({
                stylesheetFileName: stylesheet,
                sourceFileName: xml,
                destination: "serialized"
            }, "sync");
            return output.principalResult ;
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    transformKeys(obj) {



        const newObj = {item: {}};
        for (const key in obj) {
          const newKey = key.replace(/:/g, '_');
          const splitValue = obj[key].split('}');
          var newValue = obj[key];
          if (splitValue.length > 1) {
            newValue = splitValue;
          }
          newObj[newKey] = newValue;
          newObj['item'][newKey] = newValue;
        }
        return newObj;
      }
}
