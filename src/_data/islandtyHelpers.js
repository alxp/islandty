import fs from 'fs';
import path from 'path';
import SaxonJS from 'saxon-js';
import dotenv from 'dotenv';
dotenv.config();
import slugify from 'slugify';
import { slugifyWithCounter as createSlugifyCounter } from '@sindresorhus/slugify';
const slugifyWithCounter = createSlugifyCounter();
import { stripHtml } from 'string-strip-html';
import writeYamlFile from 'write-yaml-file';

import mergedIslandtyFieldInfo from '../../config/mergedIslandtyFieldInfo.json' with { type: 'json' };
import relatorNames from './TypedRelators/relators.json' with { type: 'json' };

export function cleanInputData(data) {
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
      if (fieldName in record) {
        newRecord[fieldName] = record[fieldName].split(':').pop();
      }
    }

    // The Islandora Workbench export feature sets missing file cells to "False".
    const fileFields = getFileFields();
    for (const fieldName of fileFields) {
      if (record[fieldName] == 'False') {
        newRecord[fieldName] = '';
      }
    }
    return newRecord;
  });
}

export function generateIiifMetadata(book, bookPath) {
  const info = {
    label: book.title,
    behavior: 'paged',
    description: book.field_description,
    metadata: {
      license: book.field_rights
    }
  };
  writeYamlFile.sync(path.join(bookPath, 'info.yml'), info);
}

export function getFileFields() {
  return Object.keys(mergedIslandtyFieldInfo).filter((field) =>
    mergedIslandtyFieldInfo[field].type === 'file' &&
    (mergedIslandtyFieldInfo[field].metadata_display || mergedIslandtyFieldInfo[field].downloadable)
  );
}

export function getMetadataFields() {
  return Object.keys(mergedIslandtyFieldInfo).filter(field =>
    !mergedIslandtyFieldInfo[field].metadata_display === false &&
    mergedIslandtyFieldInfo[field].type !== 'file'
  );
}

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
export function getNested(obj, ...args) {
  return args.reduce((obj, level) => obj && obj[level], obj)
}

export function getChildPosition(items, object, parent_id) {
  let childItems = getChildContent(items, parent_id);
  let index = 0;
  for (const childItem of childItems) {
    if (childItem.data.id === object.data.id) {
      return index;
    }
    index++;
  }
  return false;
}

/**
   * Finds the parent item from the current item
   *
   * @param {Array} items A list of islandty items
   * @param {Object} item The current item we want the parent of
   * @returns {Array} The resulting parent item.
   */
export function getParentContent(items, item_id) {
  let filteredItems = items.filter(x => x.id == item_id || (x.data && x.data.id == item_id));

  // Lastly, get just the first
  filteredItems = filteredItems[0];

  return filteredItems;
}

/**
   * Finds the children items from the current item
   *
   * @param {Array} items A list of islandty items
   * @param {Object} item The current item we want the children of
   * @returns {Array} The resulting children items.
   */
export function getChildContent(items, item_id) {
let filteredItems = items.filter(x => {
  // Check x.parent_id if it exists
  const parentId1 = x.parent_id;
  const parentId1Valid = parentId1 && typeof parentId1 === 'string' && parentId1.split('|').includes(item_id);

  const memberOf1 = x.field_member_of;
  const memberOf1Valid = memberOf1 && typeof memberOf1 === 'string' && memberOf1.split('|').includes(item_id);

  // Check x.data.parent_id if it exists
  const parentId2 = x.data?.parent_id;
  const parentId2Valid = parentId2 && typeof parentId2 === 'object' && parentId2.includes(item_id);

  const memberOf2 = x.data?.field_member_of;
  const memberOf2Valid = memberOf2 && typeof memberOf2 === 'object' && memberOf2.includes(item_id);

  // Return true if any condition is met
  return parentId1Valid || parentId2Valid || memberOf1Valid || memberOf2Valid;
});

return filteredItems;
}

/**
 * Finds the normalized content model associated with a string
 * which may be the natural language or URI version of an
 * Islandora 2 Model.
 *
 * @param {String} value A raw value representing a model
 * @returns {String} Name of the layout file.
 */
export function getLayoutForContentModel(value) {
  if (!value) {
    return "partials/default-item.html";
  }
  let fileSlug = slugify(value);
  var layoutFile = `partials/${fileSlug}.html`;
  if (fs.existsSync(`src/_includes/${layoutFile}`)) {
    return layoutFile;
  } else {
    return "partials/default-item.html";
  }

}

/**
 * Return the location of a IIIF Manifest for the given item.
 *
 * @param {*} item
 * @returns
 *    The path of the manifest.
 */
export function getIiifManifestForItem(item) {
  const pathPrefix = process.env.pathPrefix ? process.env.pathPrefix : '/';
  return path.join("/", pathPrefix, process.env.contentPath, item.id, 'iiif/index.json');
}

/**
 * Get all content items with the given content model (human readable name).
 *
 * @param {*} items
 * @param {*} model
 * @returns
 */
export function itemsWithContentModel(items, model) {
  let filteredItems = items.filter(x => x.data.field_model == model);

  return filteredItems;
}

/**
 * Get all content items with the given fieldname equal to the given value).
 *
 * @param {*} items
 * @param {*} fieldname
 * @param {*} model
 * @returns
 */
export function itemsWithFieldValue(items, fieldname, value) {
  const fieldInfo = mergedIslandtyFieldInfo;
  const field = fieldInfo[fieldname]
  if (field.cardinality == "1") {
    return items.filter(x => x['data'][fieldname] == value);
  }
  else {
    return items.filter(x => value in x['data'][fieldname]);
  }
}


export function searchIndex(article) {
  const fullTextFileFields = ['extracted', 'hocr'];

  const isString = value => typeof value === 'string' || value instanceof String;
  const getIndexValue = function (value, fieldName, result = '') {
    if (!(isString(value))) {
      for (const subKey in value) {
        result += subKey;
        result += ' ';
        result += getIndexValue(value[subKey], fieldName);
      }
    }
    else {
      if (fullTextFileFields.includes(fieldName) && value !== '') {
        result += stripHtml(fs.readFileSync(path.join(process.env.outputDir, value), { encoding: 'utf8' })).result;
      }
      else {
        result += value;
      }
      result += ' '
    }
    return result;
  };

  let indexString = '';
  for (const key in article.data.item) {
    indexString += getIndexValue(article.data.item[key], key);
    indexString += ' '
  }

  return JSON.stringify(indexString);
}
/**
 * Transform the data XML file of each object by the Index XSLT.
 */
export function searchIndexMods(article) {
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

  return processXSLT(ModsFile, IndexXSLTFile);
}

/**
 * Get the document's Title and URL for display as a link.
 *
 * Also gives content models a chance to modify the data.
 */
export function objectIndexMetadata(items, object) {
  if (object.data.field_model == 'Page') {
    const parent = getParentContent(items, object.data.parent_id);
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
}

/**
 * Transform the XSLT file into HTML by a given XSLT.
 */
export function processXSLT(xml, stylesheet) {

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
}

export function transformKeys(obj, csvFieldInfo = { labels: {}, cardinality: {} }) {
  const jsonFieldInfo = mergedIslandtyFieldInfo;

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
      newValue = parseLinkedAgent(newValue);
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
}

/**
 * Pull apart linked agent fields and look up relator types.
 *
 * @param {string} values
 */
export function parseLinkedAgent(values) {
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
}

export function linkedAgentUrl(namespace, type, name) {
  return '/' + path.join(process.env.linkedAgentPath, strToSlug(namespace), strToSlug(type), strToSlug(name));
}

/**
 * Transform a string into a slug
 * Uses slugify package
 *
 * @param {String} str - string to slugify
 */
export function strToSlug(str) {
  const options = {
    replacement: "-",
    remove: /[&,+()$~%.'":*?<>{}]/g,
    lower: true,
  };

  return slugify(str, options);
}

 /**
 * Transform a string into a slug
 * Uses slugify package
 *
 * @param {String} str - string to slugify
 */
 export function strToSlugWithCounter(str) {
  const options = {
    replacement: "-",
    remove: /[&,+()$~%.'":*?<>{}]/g,
    lower: true,
  };

  return slugifyWithCounter(str, options);
}
