import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import Button from '../ui/button';
import Icon from '../ui/icon';
import Spinner from '../ui/spinner';
import withFocusManager from '../../enhancers/with-focus-manager';
import withDevice from '../../enhancers/with-device';
import { getFileData } from '../../common/event';
import { pick } from '../../common/immutable';
import { TabPane } from '../ui/tabs';
import { Toolbar, ToolGroup } from '../ui/toolbars';
import { isTriggerEvent } from '../../common/event';

const Attachment = ({ attachment, deleteItem, isReadOnly, isUploading, getAttachmentUrl, onKeyDown }) => {

	const handleDelete = () => {
		deleteItem(attachment);
	}

	const handleKeyDownOrClick = ev => {
		if(isTriggerEvent(ev)) {
			ev.preventDefault();
			const { key } = ev.currentTarget.closest('[data-key]').dataset;
			openAttachment(key);
		} else if(ev.type === 'keydown') {
			onKeyDown(ev);
		}
	}

	const openAttachment = async key => {
		const url = await getAttachmentUrl(key);
		window.location = url;
	}

	return (
		<li
			data-key={ attachment.key }
			className="attachment"
		>
			<Icon type={ '16/attachment' } width="16" height="16" />
			{
				!isUploading ? (
					<a
						onClick={ handleKeyDownOrClick }
						onKeyDown={ handleKeyDownOrClick }
						tabIndex={ -2 }
					>
						{ attachment.title || attachment.filename }
					</a>
				) : (
					<span
						onKeyDown={ onKeyDown }
						tabIndex={ -2 }
					>
						{ attachment.title || attachment.filename }
						{ isUploading && <Spinner className="small" /> }
					</span>
				)
			}
			{ !isReadOnly && (
				<Button
					icon
					onClick={ handleDelete }
					tabIndex={ -1 }
				>
					<Icon type={ '16/minus-circle' } width="16" height="16" />
				</Button>
			)}
		</li>
	);
}

Attachment.propTypes = {
	attachment: PropTypes.object,
	deleteItem: PropTypes.func,
	getAttachmentUrl: PropTypes.func.isRequired,
	isReadOnly: PropTypes.bool,
	isUploading: PropTypes.bool,
	onKeyDown: PropTypes.func.isRequired,
}

const PAGE_SIZE = 100;

const Attachments = ({ childItems, device, isFetched, isFetching, isReadOnly, itemKey,
	createItem, uploadAttachment, onFocusNext, onFocusPrev, fetchChildItems,
	fetchItemTemplate, uploads, isActive, libraryKey, onBlur, onFocus,
	pointer, registerFocusRoot, ...props }) => {

	useEffect(() => {
		if(isActive && !isFetching && !isFetched) {
			const start = pointer || 0;
			const limit = PAGE_SIZE;
			fetchChildItems(itemKey, { start, limit });
		}
	}, [isActive, isFetching, isFetched, childItems]);

	const handleFileInputChange = async ev => {
		const fileDataPromise = getFileData(ev.currentTarget.files[0]);
		const attachmentTemplatePromise = fetchItemTemplate(
			'attachment', { linkMode: 'imported_file' }
		);
		const [fileData, attachmentTemplate] = await Promise.all(
			[fileDataPromise, attachmentTemplatePromise]
		);

		const attachment = {
			...attachmentTemplate,
			parentItem: itemKey,
			filename: fileData.fileName,
			title: fileData.fileName,
			contentType: fileData.contentType
		};
		const item = await createItem(attachment, libraryKey);
		await uploadAttachment(item.key, fileData);
	}

	const handleKeyDown = ev => {
		if(ev.target !== ev.currentTarget) {
			return;
		}

		if(ev.key === 'ArrowDown') {
			onFocusNext(ev);
		} else if(ev.key === 'ArrowUp') {
			onFocusPrev(ev);
		}
	}

	return (
		<TabPane
			className="attachments"
			isActive={ isActive }
			isLoading={ device.shouldUseTabs && !isFetched }
		>
			<h5 className="h2 tab-pane-heading hidden-mouse">Attachments</h5>
			<div
				className="scroll-container-mouse"
				onBlur={ onBlur }
				onFocus={ onFocus }
				ref={ ref => registerFocusRoot(ref) }
				tabIndex={ 0 }
			>
				<nav>
					<ul className="details-list attachment-list">
						{
							childItems.filter(i => i.itemType === 'attachment').map(attachment => {
								const isUploading = uploads.includes(attachment.key);
								return <Attachment
									attachment={ attachment }
									key={ attachment.key }
									isUploading={ isUploading }
									onKeyDown={ handleKeyDown }
									{ ...pick(props, ['deleteItem', 'getAttachmentUrl']) }
								/>
							})
						}
					</ul>
				</nav>
				{ !isReadOnly && (
					<Toolbar>
						<div className="toolbar-left">
							<ToolGroup>
								<div className="btn-file">
									<Button
										className="btn-link icon-left"
										tabIndex={ -1 }
									>
										<span className="flex-row align-items-center">
											<Icon type={ '16/plus' } width="16" height="16" />
											Add Attachment
										</span>
									</Button>
									<input
										onChange={ handleFileInputChange }
										onKeyDown={ handleKeyDown }
										tabIndex={ -2 }
										type="file"
									/>
								</div>
							</ToolGroup>
						</div>
					</Toolbar>
				) }
			</div>
		</TabPane>
	);
}

Attachments.propTypes = {
	childItems: PropTypes.array,
	createItem: PropTypes.func,
	device: PropTypes.object,
	fetchChildItems: PropTypes.func,
	fetchItemTemplate: PropTypes.func,
	isActive: PropTypes.bool,
	isFetched: PropTypes.bool,
	isFetching: PropTypes.bool,
	isReadOnly: PropTypes.bool,
	itemKey: PropTypes.string,
	libraryKey: PropTypes.string,
	onBlur: PropTypes.func,
	onFocus: PropTypes.func,
	onFocusNext: PropTypes.func,
	onFocusPrev: PropTypes.func,
	pointer: PropTypes.number,
	registerFocusRoot: PropTypes.func,
	uploadAttachment: PropTypes.func,
	uploads: PropTypes.array,
};

export default withDevice(withFocusManager(Attachments));