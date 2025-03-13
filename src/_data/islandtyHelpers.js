const fs = require('fs');
const path = require('path');
const SaxonJS = require('saxon-js');
require('dotenv').config();
const slugify = require('slugify');



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
   * Returns the value of a property nested inside an array.
   *
   * {@see} https://stackoverflow.com/questions/2631001/test-for-existence-of-nested-javascript-object-key
   *
   * @param {*} obj
   *   The top-level object.
   * @param  {...any} args
   *   Any number of properties to check into the object's tree.
   * @returns
   *   The property value.
   */
  getNested(obj, ...args) {
    return args.reduce((obj, level) => obj && obj[level], obj)
  },

  /**
     * Finds the parent item from the current item
     *
     * @param {Array} items A list of islandty items
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
     * @param {Array} items A list of islandty items
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
    const pathPrefix = process.env.pathPrefix ? process.env.pathPrefix : '/';
    let manifest_url = path.join("/", pathPrefix, path.dirname(file), 'iiif/index.json');
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
   * Get all content items with the given fieldname equal to the given value).
   *
   * @param {*} items
   * @param {*} fieldname
   * @param {*} model
   * @returns
   */
  itemsWithFieldValue(items, fieldname, value) {
    fieldInfo = require('../../config/islandtyFieldInfo.json');
    field = fieldInfo[fieldname]
    if (field.cardinality == "1") {
      return items.filter(x => x[fieldname] == value);
    }
    else {
      return items.filter(x => value in x[fieldname]);
    }
  },


  searchIndex(article) {
    let isString = value => typeof value === 'string' || value instanceof String;
    let getIndexValue = function (value, result = '') {
      if (!(isString(value))) {
        for (key in value) {
          result += key;
          result += ' ';
          result += getIndexValue(value[key])
        }
      }
      else {
        result += value;
        result += ' '
      }
      return result;
    };

    indexString = '';
    for (key in article.data.item) {
      indexString += getIndexValue(article.data.item[key]);
      indexString += ' '
    }

    return JSON.stringify(indexString);
  },
  /**
   * Transform the data XML file of each object by the Index XSLT.
   */
  searchIndexMods(article) {
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
  processXSLT(xml, stylesheet) {

    try {
      const output = SaxonJS.transform({
        stylesheetFileName: stylesheet,
        sourceFileName: xml,
        destination: "serialized"
      }, "sync");
      return output.principalResult;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  transformKeys(obj) {
    fieldInfo = require('../../config/islandtyFieldInfo.json');

    // Add permalink field.
    obj['permalink'] = '/' + process.env.contentPath + '/' + obj.id + '/index.html';

    const newObj = { item: {} };


    for (const key in obj) {
      const newKey = key.replace(/:/g, '_');
      var newValue = obj[key];
      if (fieldInfo[key] && fieldInfo[key]['cardinality'] != 1
        && typeof obj[key].split === 'function'
      ) {
        const splitValue = obj[key].split('|');
        newValue = splitValue;
      }
      if (key == 'field_linked_agent') {
        newValue = this.parseLinkedAgent(newValue);
        //this.addLinkedAgentTags(newValue);
      }
      newObj[newKey] = newValue;
      newObj['item'][newKey] = newValue;
    }
    return newObj;
  },

  /**
   * Pull apart linked agent fields and look up relator types.
   *
   * @param {string} values
   */
  parseLinkedAgent(values) {
    var valuesArray;
    var parsedRelations = {};
    if (typeof (values) == 'string') {
      if (values.length == 0) {
        valuesArray = [];
      }
      else {
        valuesArray = [values];
      }
    }
    else {
      valuesArray = values;
    }
    for (const value of valuesArray) {
      const chunks = value.split(':');
      if (chunks.length == 4) {
        const relatorType = chunks[0];
        try {
          const relatorNames = require('./TypedRelators/' + relatorType + '.json');
          const relatorName = relatorNames[chunks[1]]['label'];
          if (!(relatorType in parsedRelations)) {
            parsedRelations[relatorType] = {};
          }
          if (relatorName in parsedRelations[relatorType]) {
            parsedRelations[relatorType][relatorName].push(chunks[3]);
          }
          else {
            parsedRelations[relatorType][relatorName] = [chunks[3]];
          }

        }
        catch (e) {
          console.log(e);
        }

      }
    }
    return parsedRelations;
  },


  /**
   * Get all unique key values from a collection
   *
   * {@see} https://www.webstoemp.com/blog/basic-custom-taxonomies-with-eleventy/
   *
   * @param {Array} collectionArray - collection to loop through
   * @param {String} key - key to get values from
   */
  getAllKeyValues(collectionArray, key) {
    // get all values from collection
    let allValues = collectionArray.map((item) => {
      let values = item.data[key] ? item.data[key] : [];
      return values;
    });

    // flatten values array
    allValues = lodash.flattenDeep(allValues);
    // to lowercase
    allValues = allValues.map((item) => item.toLowerCase());
    // remove duplicates
    allValues = [...new Set(allValues)];
    // order alphabetically
    allValues = allValues.sort(function (a, b) {
      return a.localeCompare(b, "en", { sensitivity: "base" });
    });
    // return
    return allValues;
  },

  linkedAgentUrl(namespace, type, name) {
    return '/' + path.join(process.env.linkedAgentPath, this.strToSlug(namespace), this.strToSlug(type), this.strToSlug(name));
  },

  /**
   * Transform a string into a slug
   * Uses slugify package
   *
   * @param {String} str - string to slugify
   */
  strToSlug(str) {
    const options = {
      replacement: "-",
      remove: /[&,+()$~%.'":*?<>{}]/g,
      lower: true,
    };

    return slugify(str, options);
  }



}
