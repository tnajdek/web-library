import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const ShareTarget = () => {
	const dispatch = useDispatch();
	const parsedUrl = new URL(window.location);
	const title = parsedUrl.searchParams.get('title');
	const text = parsedUrl.searchParams.get('text');
	const url = parsedUrl.searchParams.get('url');

	return (
		<div>
			<h1>Share Target</h1>
			<div>
				<label>title:</label>
				<span>{ title }</span>
			</div>
			<div>
				<label>text:</label>
				<span>{ text }</span>
			</div>
			<div>
				<label>url:</label>
				<span>{ url }</span>
			</div>
		</div>
	);
}

export default ShareTarget;
