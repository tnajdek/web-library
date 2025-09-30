// https://github.com/zotero/zotero/blob/master/chrome/content/zotero/xpcom/annotations.js

// const ANNOTATION_POSITION_MAX_SIZE = 65000;

/**
 * @param {Object} item
 * @returns {Object} reader compatible annotation data
 */
const annotationItemToJSON = (item, { attachmentItem, currentUser, createdByUser, isGroup, isReadOnly, libraryKey, lastModifiedByUser, tagColors = new Set() } = {}) => {
	const o = {};
	o.libraryID = libraryKey;
	o.id = item.key;
	o.type = item.annotationType;
	o.isExternal = item.annotationIsExternal;
	const isAuthor = !item[Symbol.for('meta')]?.createdByUser?.id || item[Symbol.for('meta')]?.createdByUser?.id === currentUser?.id;

	if (item.annotationAuthorName) {
		o.authorName = item.annotationAuthorName;
		if (isGroup) {
			o.lastModifiedByUser = lastModifiedByUser?.id || createdByUser?.id;
		}
	}
	else if (!o.isExternal && isGroup) {
		o.authorName = createdByUser?.name || createdByUser?.username;
		o.isAuthorNameAuthoritative = true;
		if (lastModifiedByUser) {
			o.lastModifiedByUser = lastModifiedByUser?.name || lastModifiedByUser?.username;
		}
	}
	o.readOnly = isReadOnly || o.isExternal || !isAuthor;
	if (o.type === 'highlight' || o.type === 'underline') {
		o.text = item.annotationText;
	}

	o.comment = item.annotationComment;
	o.pageLabel = item.annotationPageLabel;
	o.color = item.annotationColor;
	o.sortIndex = item.annotationSortIndex;
	// annotationPosition is a JSON string, but we want to pass the raw object to the reader
	o.position = JSON.parse(item.annotationPosition);

	// Add tags and tag colors
	const tags = item.tags.map((t) => {
		const obj = {
			name: t.tag
		};
		if (tagColors.has(t.tag)) {
			obj.color = tagColors.get(t.tag).color;
			// Add 'position' for sorting
			obj.position = tagColors.get(t.tag).position;
		}
		return obj;
	});
	// Sort colored tags by position and other tags by name
	tags.sort((a, b) => {
		if (!a.color && !b.color) {
			return a.name.localeCompare(b.name, { sensitivity: 'accent' });
		}
		if (!a.color && !b.color) { return -1 }
		if (!a.color && b.color) { return 1 }
		return a.position - b.position;
	});
	// Remove temporary 'position' value
	tags.forEach(t => delete t.position);
	o.tags = tags || [];

	if(item.dateModified) {
		o.dateModified = item.dateModified;
	} else {
		o.dateModified = attachmentItem.dateModified;
	}

	return o;
};

/**
 * @param {Object} json reader compatible annotation data
 * @return {Object} Annotation item
 */
const annotationItemFromJSON = function (json) {
	var item = {
		itemType: 'annotation'
	};

	item.key = json.id;
	item.annotationType = json.type;
	item.annotationAuthorName = json.authorName || '';
	if (json.type === 'highlight' || json.type === 'underline') {
		item.annotationText = json.text;
	}
	item.annotationIsExternal = !!json.isExternal;
	item.annotationComment = json.comment;
	item.annotationColor = json.color;
	item.annotationPageLabel = json.pageLabel;
	item.annotationSortIndex = json.sortIndex;

	item.annotationPosition = JSON.stringify(Object.assign({}, json.position));
	item.tags = (json.tags || []).map(t => ({ tag: t.name }));

	return item;
};

// /**
//  * Split annotation if position exceeds the limit
//  *
//  * @param {Object} annotation
//  * @returns {Array<Object>} annotations
//  */
// const splitAnnotationJSON = function (annotation) {
// 	let splitAnnotations = [];
// 	let tmpAnnotation = null;
// 	let totalLength = 0;
// 	if (annotation.position.rects) {
// 		for (let i = 0; i < annotation.position.rects.length; i++) {
// 			let rect = annotation.position.rects[i];
// 			if (!tmpAnnotation) {
// 				tmpAnnotation = JSON.parse(JSON.stringify(annotation));
// 				// TODO: Generate item key
// 				// tmpAnnotation.key = Zotero.DataObjectUtilities.generateKey();
// 				tmpAnnotation.position.rects = [];
// 				totalLength = JSON.stringify(tmpAnnotation.position).length;
// 			}
// 			// [],
// 			let length = rect.join(',').length + 3;
// 			if (totalLength + length <= ANNOTATION_POSITION_MAX_SIZE) {
// 				tmpAnnotation.position.rects.push(rect);
// 				totalLength += length;
// 			}
// 			else if (!tmpAnnotation.position.rects.length) {
// 				throw new Error(`Cannot fit single 'rect' into 'position'`);
// 			}
// 			else {
// 				splitAnnotations.push(tmpAnnotation);
// 				tmpAnnotation = null;
// 				i--;
// 			}
// 		}
// 		if (tmpAnnotation) {
// 			splitAnnotations.push(tmpAnnotation);
// 		}
// 	}
// 	else if (annotation.position.paths) {
// 		for (let i = 0; i < annotation.position.paths.length; i++) {
// 			let path = annotation.position.paths[i];
// 			for (let j = 0; j < path.length; j += 2) {
// 				if (!tmpAnnotation) {
// 					tmpAnnotation = JSON.parse(JSON.stringify(annotation));
// 					// TODO: Generate item key
// 					// tmpAnnotation.key = Zotero.DataObjectUtilities.generateKey();
// 					tmpAnnotation.position.paths = [[]];
// 					totalLength = JSON.stringify(tmpAnnotation.position).length;
// 				}
// 				let point = [path[j], path[j + 1]];
// 				// 1,2,
// 				let length = point.join(',').length + 1;
// 				if (totalLength + length <= ANNOTATION_POSITION_MAX_SIZE) {
// 					tmpAnnotation.position.paths[tmpAnnotation.position.paths.length - 1].push(...point);
// 					totalLength += length;
// 				}
// 				else if (tmpAnnotation.position.paths.length === 1
// 					&& !tmpAnnotation.position.paths[tmpAnnotation.position.paths.length - 1].length) {
// 					throw new Error(`Cannot fit single point into 'position'`);
// 				}
// 				else {
// 					splitAnnotations.push(tmpAnnotation);
// 					tmpAnnotation = null;
// 					j -= 2;
// 				}
// 			}
// 			// If not the last path
// 			if (i !== annotation.position.paths.length - 1) {
// 				// [],
// 				totalLength += 3;
// 				tmpAnnotation.position.paths.push([]);
// 			}
// 		}
// 		if (tmpAnnotation) {
// 			splitAnnotations.push(tmpAnnotation);
// 		}
// 	}
// 	return splitAnnotations;
// };
//
// /**
//  * Split annotations
//  *
//  * @param {Zotero.Item[]} items annotation items
//  */
// const splitAnnotations = function (items) {
// 	let createItems = [];
// 	let deleteItems = [];
// 	if (!Array.isArray(items)) {
// 		items = [items];
// 	}
// 	if (!items.every(item => item.itemType === 'annotation')) {
// 		throw new Error('All items must be annotations');
// 	}
// 	for (let item of items) {
// 		if (item.annotationPosition.length <= ANNOTATION_POSITION_MAX_SIZE) {
// 			continue;
// 		}
// 		let annotation = annotationItemToJSON(item);
// 		let splitAnnotations = splitAnnotationJSON(annotation);
// 		for (let splitAnnotation of splitAnnotations) {
// 			createItems.push(annotationItemFromJSON(item.parentItem, splitAnnotation));
// 		}
// 		deleteItems.push(item);
// 	}
// 	return { createItems, deleteItems };
// };

export { annotationItemToJSON, annotationItemFromJSON };
