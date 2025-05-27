const fs = require('fs');
const path = require('path');
const SaxonJS = require('saxon-js');
require('dotenv').config();
const slugify = require('slugify');
const slugifyWithCounter = require('@sindresorhus/slugify').slugifyWithCounter();

module.exports = {

  cleanInputData(data) {
    const fieldMappings = [
      { destination: 'id', source: 'node_id' },
      { destination: 'parent_id', source: 'field_member_of' }
    ];

    return data.map(record => {
      const newRecord = { ...record };

      for (const mapping of fieldMappings) {
        const dest = mapping.destination;
        const src = mapping.source;

        // Check if destination field is missing or empty
        const currentDestValue = newRecord[dest];
        if (currentDestValue === undefined || currentDestValue === null || currentDestValue === '') {
          // Get source value
          const srcValue = newRecord[src];

          // Set destination based on source value
          if (srcValue !== undefined && srcValue !== null && srcValue !== '') {
            newRecord[dest] = srcValue;
          } else {
            newRecord[dest] = '';
          }
        }
      }

      for (const fieldName of ['field_model']) {
        newRecord[fieldName] = record[fieldName].split(':').pop();
      }

      // The Islandora Workbench export feature sets missing file cells to "False".
      const fileFields = this.getFileFields();
      for (const fieldName of fileFields) {
        if (record[fieldName] == 'False') {
          newRecord.fieldName = '';
        }
      }
      return newRecord;
    });
  },

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

  getFileFields() {
    const islandtyFieldInfo = require('../../config/islandtyFieldInfo.json');

    return Object.keys(islandtyFieldInfo).filter((field) =>
      islandtyFieldInfo[field].type === 'file' &&
      (islandtyFieldInfo[field].metadata_display || islandtyFieldInfo[field].downloadable)
    );
  },

  getMetadataFields() {
    const islandtyFieldInfo = require('../../config/islandtyFieldInfo.json');
    return Object.keys(islandtyFieldInfo).filter(field =>
      !islandtyFieldInfo[field].metadata_display === false &&
      islandtyFieldInfo[field].type !== 'file'
    );
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

  getChildPosition(items, object, parent_id) {
    let childItems = this.getChildContent(items, parent_id);
    let index = 0;
    for (const childItem of childItems) {
      if (childItem.data.id = object.data.id) {
        return index;
      }
    }
    return false;
  },

  /**
     * Finds the parent item from the current item
     *
     * @param {Array} items A list of islandty items
     * @param {Object} item The current item we want the parent of
     * @returns {Array} The resulting parent item.
     */
  getParentContent(items, item_id) {
    let filteredItems = items.filter(x => x.id == item_id || (x.data && x.data.id == item_id));

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
  let filteredItems = items.filter(x => {
    // Check x.parent_id if it exists
    const parentId1 = x.parent_id;
    const parentId1Valid = parentId1 && typeof parentId1 === 'string' && parentId1.split('|').includes(item_id);

    // Check x.data.parent_id if it exists
    const parentId2 = x.data?.parent_id;
    const parentId2Valid = parentId2 && typeof parentId2 === 'object' && parentId2.includes(item_id);

    // Return true if either condition is met
    return parentId1Valid || parentId2Valid;
  });

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
  getIiifManifestForItem(item) {
    const pathPrefix = process.env.pathPrefix ? process.env.pathPrefix : '/';
    return path.join("/", pathPrefix, process.env.contentPath, item.id, 'iiif/index.json');
  },

  /**
   * Get all content items with the given content model (human readable name).
   *
   * @param {*} items
   * @param {*} model
   * @returns
   */
  itemsWithContentModel(items, model) {
    let filteredItems = items.filter(x => x.data.field_model == model);

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
      return items.filter(x => x['data'][fieldname] == value);
    }
    else {
      return items.filter(x => value in x['data'][fieldname]);
    }
  },


  searchIndex(article) {
const fullTextFileFields = ['extracted'];

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
        if (fullTextFileFields.includes(key) && value !== '') {
          result += fs.readFileSync(path.join(process.env.outputDir, value), { encoding: 'utf8' });
        }
        else {
          result += value;
        }
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
   * Get the document's Title and URL for display as a link.
   *
   * Also gives content models a chance to modify the data.
   */
  objectIndexMetadata(items, object) {
    if (object.data.field_model == 'Page') {
      const parent = this.getParentContent(items, object.data.parent_id);
      let page = object.data.field_weight;
      if (parent) {
        object.data.title = object.data.title + ' – ' + parent.data.title;

        if (!isNaN(page)) {
          // Pages in Islandora are 1-indexed.
          page -= 1;
          if (page > 0) {
            object.url = parent.url + '?page=' + page;
          }
        }
      }
    }
    return object;
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
  transformKeys(obj, csvFieldInfo = { labels: {}, cardinality: {} }) {
    const jsonFieldInfo = require('../../config/islandtyFieldInfo.json');

    // Add permalink field.
    obj['permalink'] = '/' + process.env.contentPath + '/' + obj.id + '/index.html';

    const newObj = { item: {} };

    for (const key in obj) {
      const newKey = key.replace(/:/g, '_');
      let newValue = obj[key];

      // Determine cardinality - prioritize CSV info over JSON
      let cardinality = '1'; // default
      if (csvFieldInfo.cardinality && csvFieldInfo.cardinality[key]) {
        cardinality = csvFieldInfo.cardinality[key];
      } else if (jsonFieldInfo[key] && jsonFieldInfo[key].cardinality) {
        cardinality = jsonFieldInfo[key].cardinality;
      }

      // Split values if cardinality is not 1
      if (cardinality != '1' && typeof obj[key].split === 'function') {
        const splitValue = obj[key].split('|');
        newValue = splitValue;
      }

      if (key == 'field_linked_agent') {
        newValue = this.parseLinkedAgent(newValue);
      }

      newObj[newKey] = newValue;
      newObj['item'][newKey] = newValue;

      // Add label if available (prioritize CSV)
      if (csvFieldInfo.labels && csvFieldInfo.labels[key]) {
        newObj[`${newKey}_label`] = csvFieldInfo.labels[key];
      } else if (jsonFieldInfo[key] && jsonFieldInfo[key].label) {
        newObj[`${newKey}_label`] = jsonFieldInfo[key].label;
      }
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
  },

   /**
   * Transform a string into a slug
   * Uses slugify package
   *
   * @param {String} str - string to slugify
   */
   strToSlugWithCounter(str) {
    const options = {
      replacement: "-",
      remove: /[&,+()$~%.'":*?<>{}]/g,
      lower: true,
    };

    return slugifyWithCounter(str, options);
  },

}
