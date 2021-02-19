import './wydr';
import init from './init';

const targetDom = document.getElementById('zotero-web-library');
const configDom = document.getElementById('zotero-web-library-config');
const menuConfigDom = document.getElementById('zotero-web-library-menu-config');
const config = configDom ? JSON.parse(configDom.textContent) : {};
config.menus = menuConfigDom ? JSON.parse(menuConfigDom.textContent) : null;

if(targetDom) {
	init(targetDom, config);

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/service-worker.js');
	}

	window.addEventListener('beforeinstallprompt', (event) => {
		console.log('beforeinstallprompt', event);
		window.deferredPrompt = event;
	});

	window.addEventListener('appinstalled', (event) => {
		console.log('appinstalled', event);
		window.deferredPrompt = null;
	});
}
