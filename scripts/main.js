import { Settings } from './settings.js';
// Generates random number using a cryptographic method
function getCryptoRandom() {
	let buffer = new ArrayBuffer(8);
	let ints = new Int8Array(buffer);
	window.crypto.getRandomValues(ints);
	ints[7] = 63;
	ints[6] |= 0xf0;
	return new DataView(buffer).getFloat64(0, true) - 1;
}
// Generates random number with fudge factor based on the current settings
function getRandom() {
	let r = getCryptoRandom();
	switch (Settings.fudgeValue) {
	case "MINIMAL":
		return 0.001;
	case "MAXIMAL":
		return 1;
	case "HIGH":
		return r < 0.49 && getCryptoRandom() >= 0.5 ? r * 2 : r;
	case "LOW":
		return r > 0.49 && getCryptoRandom() >= 0.5 ? r / 2 : r;
	case "CUSTOM":
		if (Settings.exactFudgeValue / 100 <= 1){
			return Settings.exactFudgeValue / 100;
		}
	default:
		return r;
	}
}
Hooks.once('init', () => {
	Settings.registerSettings();
});
Hooks.once('ready', () => {
	// Use getRandom() or getCryptoRandom() based on settings
	CONFIG.Dice.randomUniform = (Settings.getEnableFudgeDice()) ? getRandom : getCryptoRandom;
	// Freeze the Dice class for players to avoid modification (harder to cheat)
	if (!Settings.getOnlyForPlayer() || !game.user.hasRole("TRUSTED",1)) {
		Object.freeze(CONFIG.Dice);
	}
});
Hooks.on('renderSidebarTab', (app, html, data) => {
	if (!game.user.hasRole("TRUSTED",1) || !Settings.getEnableFudgeDice() || game.user.isGM) return;
	let $chatForm = html.find('#chat-form');
	const template = 'modules/dice-rng-protector/templates/tray.html';
	const dataObject = {};
	renderTemplate(template, dataObject).then(content => {
		if (content.length > 0) {
			let $content = $(content);
			$chatForm.after($content);
			// Update fudge factor setting when a radio button is clicked
			$content.find("input[type='radio']").on('click', event => {
				let value = $(event.currentTarget).attr('value');
				Settings.fudgeValue = value;
			});
		}
	});
});
