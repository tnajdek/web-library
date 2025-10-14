import { createItem, deleteItem, getAttachmentUrl, updateItem, renameAttachment } from '.';
import { BEGIN_RECOGNIZE_DOCUMENT, COMPLETE_RECOGNIZE_DOCUMENT, ERROR_RECOGNIZE_DOCUMENT,
	UPDATE_RECOGNIZE_DOCUMENT, BEGIN_UNRECOGNIZE_DOCUMENT, COMPLETE_UNRECOGNIZE_DOCUMENT,
	ERROR_UNRECOGNIZE_DOCUMENT, } from '../constants/actions';
import { PDFWorker } from '../common/pdf-worker.js';
import { pick } from 'web-common/utils';
import { getItemFromIdentifier } from '../common/identifiers';
import { getFileBaseNameFromItem, getValidFileName } from '../common/format';

const retrieveMetadata = (itemKey, libraryKey, backgroundTaskId) => {
	return async (dispatch, getState) => {
		dispatch({ type: BEGIN_RECOGNIZE_DOCUMENT, itemKey, libraryKey, backgroundTaskId });
		const state = getState();
		const attachmentItem = state.libraries[state.current.libraryKey]?.items?.[itemKey];
		const originalFilename = attachmentItem.filename;
		const originalTitle = attachmentItem.title;
		try {
			const recognizerData = await dispatch(getRecognizerData(itemKey));
			dispatch({ type: UPDATE_RECOGNIZE_DOCUMENT, itemKey, libraryKey, stage: 1 });
			const recognizedItem = await dispatch(recognizePDF(recognizerData));

			dispatch({ type: UPDATE_RECOGNIZE_DOCUMENT, itemKey, libraryKey, stage: 2 });
			delete recognizedItem.key;
			delete recognizedItem.version;
			recognizedItem.collections = [...attachmentItem.collections];
			const item = await dispatch(createItem(recognizedItem, libraryKey));

			dispatch({ type: UPDATE_RECOGNIZE_DOCUMENT, itemKey, libraryKey, stage: 3 });
			await dispatch(updateItem(itemKey, { parentItem: item.key, title: 'PDF', collections: [] }, libraryKey));
			const newFileName = getValidFileName(`${getFileBaseNameFromItem(item, state.meta.mappings)}.pdf`);
			await dispatch(renameAttachment(itemKey, newFileName, libraryKey));
			dispatch({ type: COMPLETE_RECOGNIZE_DOCUMENT, itemKey, libraryKey, parentItemKey: item.key, originalFilename, originalTitle });
		} catch (error) {
			dispatch({
				type: ERROR_RECOGNIZE_DOCUMENT,
				itemKey,
				libraryKey,
				silent: true, // do not display an error message, this error is only relevant in the recognizer UI
				error: error?.message ?? 'Failed to recognize document'
			});
		}
	}
}


// extract metadata from the PDF and send it to the recognizer server
const getRecognizerData = itemKey => {
	return async (dispatch, getState) => {
		const state = getState();
		const attachmentItem = state.libraries[state.current.libraryKey]?.items?.[itemKey];
		if (attachmentItem.contentType !== 'application/pdf') {
			throw new Error("Attachment is not a PDF");
		}

		const attachmentURL = await dispatch(getAttachmentUrl(itemKey));
		let response = await fetch(attachmentURL);
		if (response.status === 410) {
			const attachmentURL = await dispatch(getAttachmentUrl(itemKey, true));
			response = await fetch(attachmentURL);
		}

		const data = await response.arrayBuffer();
		const { pdfWorkerURL, pdfReaderCMapsURL, pdfReaderStandardFontsURL, recognizerUrl } = state.config;
		const pdfWorker = new PDFWorker({ pdfWorkerURL, pdfReaderCMapsURL, pdfReaderStandardFontsURL });
		const recognizerInputData = await pdfWorker.getRecognizerData(data); // TODO: add suport for password-protected PDFs
		recognizerInputData.fileName = attachmentItem.filename;

		const containingTextPages = recognizerInputData.pages.reduce((acc, page) => {
			if (page?.[2]?.length) {
				acc++;
			}
			return acc;
		}, 0);

		if (containingTextPages === 0) {
			// TODO
			throw new Error('PDF does not contain any text');
		}

		const url = `${recognizerUrl}/recognize`;
		const recognizerResponse = await fetch(url, {
			method: 'POST',
			mode: 'cors',
			headers: { 'content-type': 'application/json', },
			body: JSON.stringify(recognizerInputData)
		});
		if (recognizerResponse.ok) {
			return await recognizerResponse.json();
		} else {
			throw new Error('Failed to recognize document');
		}
	}
}


// create item based on data returned from recognizer
// based on https://github.com/zotero/zotero/blob/5fd94e22dff87318aa3a84e735e1fdece488f5e3/chrome/content/zotero/xpcom/recognizeDocument.js#L411
const recognizePDF = (recognizerData) => {
	return async (dispatch, getState) => {
		const state = getState();
		const { translateUrl } = state.config;
		let identifierPrefix = '';
		let idenfitierValue = '';
		if (recognizerData.arxiv) {
			identifierPrefix = 'arxiv';
			idenfitierValue = recognizerData.arxiv;
		} else if (recognizerData.doi) {
			identifierPrefix = 'DOI';
			idenfitierValue = recognizerData.doi;
		} else if (recognizerData.isbn) {
			identifierPrefix = 'ISBN';
			idenfitierValue = recognizerData.isbn;
		}

		if (identifierPrefix && idenfitierValue) {
			try {
				const translatedItem = await getItemFromIdentifier(
					`${identifierPrefix}: ${idenfitierValue}`, translateUrl
				);
				if (translatedItem) {
					if (!translatedItem.abstractNote && recognizerData.abstract) {
						translatedItem.abstractNote = recognizerData.abstract;
					}
					if (!translatedItem.language && recognizerData.language) {
						translatedItem.language = recognizerData.language;
					}
					if (translatedItem.tags) {
						translatedItem.tags = translatedItem.tags.map(tag => {
							if (typeof tag === 'string') {
								return { tag, type: 1 };
							}
							tag.type = 1;
							return tag;
						});
					}
					return translatedItem;
				}
			} catch (e) {
				// if this fails (e.g. translation server returns 500), we log the error and continue with the fallback using the recognizer data
				console.error(`Failed to translate identfier (${identifierPrefix}:${idenfitierValue}):\n${e}\n\nFalling back to recognizer data`);
			}
		}

		// no identifier found, or translation failed
		if (recognizerData.title) {
			let itemType = 'journalArticle';

			if (recognizerData.type === 'book-chapter') {
				itemType = 'bookSection';
			}

			const newItem = {
				itemType,
				creators: recognizerData.authors.map(author => ({
					creatorType: 'author', ...pick(author, ['firstName', 'lastName'])
				})),
				title: recognizerData.title,
				abstractNote: recognizerData.abstract,
				date: recognizerData.year,
				libraryCatalog: 'Zotero',
				...pick(recognizerData, ['pages', 'volume', 'url', 'language']),
				...(itemType === 'journalArticle' ? { issue: recognizerData.issue, issn: recognizerData.ISSN, publicationTitle: recognizerData.container } : {}),
				...(itemType === 'bookSection' ? { bookTitle: recognizerData.container, publisher: recognizerData.publisher } : {}),
			};

			return newItem;
		}

		return null;
	}
}

const undoRetrieveMetadata = (itemKey, libraryKey) => {
	// itemKey is the recognized item, that needs to be deleted; originalItemKey is the attachment item, that needs to be restored as top-level item
	return async (dispatch, getState) => {
		const state = getState();
		dispatch({
			type: BEGIN_UNRECOGNIZE_DOCUMENT,
			itemKey,
			libraryKey,
		});
		try {
			const originalItemData = state.recognize.lookup[`${libraryKey}-${itemKey}`];
			if(!originalItemData) {
				throw new Error('Original item not found');
			}
			const { originalItemKey, originalFilename, originalTitle } = originalItemData;
			const item = state.libraries[libraryKey].items?.[itemKey];
			if(!item) {
				throw new Error('Item not found');
			}

			const collections = item.collections;
			await dispatch(updateItem(originalItemKey, { parentItem: false, title: originalTitle, collections }, libraryKey));
			await dispatch(renameAttachment(originalItemKey, originalFilename, libraryKey));
			await dispatch(deleteItem(item));
			dispatch({
				type: COMPLETE_UNRECOGNIZE_DOCUMENT,
				itemKey,
				libraryKey,
				originalItemKey,
			});
		} catch (error) {
			dispatch({
				type: ERROR_UNRECOGNIZE_DOCUMENT,
				itemKey,
				libraryKey,
				error: error?.message ?? 'Failed to undo retrieve metadata'
			});
		}
	}
}

export { retrieveMetadata, undoRetrieveMetadata };
