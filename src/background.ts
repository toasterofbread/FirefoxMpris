import { Protocol } from "./protocol.js";
import { YoutubeProtocol } from "./protocols/youtube.js";

const PROTOCOLS = [
	YoutubeProtocol
];

async function getTabProtocol(tab: browser.tabs.Tab): Promise<typeof Protocol | null> {
	for (let protocol of PROTOCOLS) {
		if (await protocol.supportsTab(tab)) {
			return protocol;
		}
	}
	return null;
}

let port = browser.runtime.connectNative("firefoxmpris");
port.onMessage.addListener(onMessageReceived);

class VProperties {
	STATUS = "status";
	FULLSCREEN = "fullscreen";
	LOOP = "loop";
	IS_PLAYLIST = "is_playlist";
	SHUFFLE = "shuffle";
	VOLUME = "volume";
	POSITION = "position";
	PLAYBACK_RATE = "playback_rate";
	TRACK_ID = "track_id";
	DURATION = "duration";
	ART_URL = "art_url";
	URL = "url";
	TITLE = "title";
	ALBUM_NAME = "album_name";
	DISC_NUMBER = "disc_number";
	TRACK_NUMBER = "track_number";
	ARTISTS = "artists";
	ALBUM_ARTISTS = "album_artists";
	COMMENTS = "comments";

	CANQUIT = "CanQuit";
	CANRAISE = "CanRaise";
	CANSETFULLSCREEN = "CanSetFullscreen";
	IDENTITY = "Identity";
	DESKTOPENTRY = "DesktopEntry";
	SUPPORTEDURISCHEMES = "SupportedUriSchemes";
	SUPPORTEDMIMETYPES = "SupportedMimeTypes";

	CAN_GO_NEXT = "can_go_next";
	CAN_GO_PREVIOUS = "can_go_previous";
	CAN_PLAY = "can_play";
	CAN_PAUSE = "can_pause";
	CAN_SEEK = "can_seek";
	CAN_CONTROL = "can_control";
};
export const VideoProperties = new VProperties;

export async function runCode(code: CallableFunction, tabId: number, args: any[] = []) {
	// @ts-expect-error
	let result = (await browser.scripting.executeScript({
		target: {
			tabId: tabId
		},
		func: code,
		args: args
	}))[0];

	if (!result) {
		return null;
	}

	if (result.error) {
		throw result.error;
	}

	return result.result;
}

function sendMessage(message: any) {
	message = JSON.stringify(message);
	try {
		console.log("SENDING MESSAGE: ", message);
		port.postMessage(message);
	}
	catch (err) {
		console.log(err);
	}
}

function emitEvent(type: string, data: any) {
	let object: any = {};
	Object.keys(data).forEach(key => {
		object[key] = data[key];
	})
	object.type = type;
	sendMessage(object);
}

async function onMessageReceived(message: any) {
	let type = message.type;

	console.log("MESSAGE RECEIVED: ", message);

	let protocol: Protocol | null = null;
	if ("tab" in message) {
		const protocol_type = await getTabProtocol(await browser.tabs.get(message.tab));
		if (protocol_type) {
			protocol = new protocol_type(message.tab);
		}
	}

	switch (type) {
		case "play": {
			await runCode(() => {
				document.querySelector("video")?.play()
			}, message.tab);
			break;
		}

		case "update_tab": {
			let result = await protocol?.getProperties();
			result.tab = message.tab;
			emitEvent("update_tab", result);
			break;
		}

		case "raise_tab": {
			browser.tabs.update(message.tab, {active: true});
			break;
		}

		case "mpris_method": {
			protocol?.callMethod(message.method, message.args);
		}

		case "mpris_set": {
			protocol?.setProperty(message.property, message.value);
		}

		default: {
			break;
		}
	}
}

async function onTabUpdated(tabId: number, _changeInfo: any) {

	emitEvent("tab_changed", {
		"tab": tabId, 
		"url": (await browser.tabs.get(tabId)).url!,
		supported: await getTabProtocol(await browser.tabs.get(tabId)) != null
	});

	runCode((tabId: number, extensionId: string, Properties: VProperties) => {
		let video = document.querySelector("video");
		if (video == null || video.getAttribute("mpris-listeners-attached") == "true") {
			return;
		}

		video.setAttribute("mpris-listeners-attached", "true");

		video.addEventListener("pause", () => {
			const video: HTMLMediaElement = document.querySelector("video")!;
			let port = browser.runtime.connect({name: extensionId})
			port.postMessage({type: "set", key: Properties.STATUS, value: video.ended ? 0 : video.paused ? 1 : 2, tab: tabId});
		})

		video.addEventListener("play", () => {
			const video: HTMLMediaElement = document.querySelector("video")!;
			let port = browser.runtime.connect({name: extensionId})
			port.postMessage({type: "set", key: Properties.STATUS, value: video.ended ? 0 : video.paused ? 1 : 2, tab: tabId});
		})

		var target = document.querySelector('head > title')!;
		var observer = new window.MutationObserver((mutations: any) => {
			mutations.forEach((mutation: any) => {
				let port = browser.runtime.connect({name: extensionId})
				port.postMessage({type: "reload"});
			});
		});
		observer.observe(target, { subtree: true, characterData: true, childList: true });
	}, tabId, [tabId, browser.runtime.id, VideoProperties])
}

function onTabDeleted(tabId: number) {
	emitEvent("tab_closed", {"tab": tabId});
}

function onTabConnected(port: browser.runtime.Port) {
	port.onMessage.addListener((event: any) => {
		switch (event.type) {
			case "set": {
				emitEvent("property_changed", event);
				break;
			}
			case "reload": {
				onTabUpdated(port.sender?.tab?.id!, null)
			}
		}
	})
}

// @ts-expect-error
browser.tabs.onUpdated.addListener(onTabUpdated, {properties: ["url"]});
browser.tabs.onRemoved.addListener(onTabDeleted);

browser.runtime.onConnect.addListener(onTabConnected);

browser.windows.getAll({populate: true}).then(async windows => {
	for (let window of windows) {
		for (let tab of window.tabs!) {
				if (tab.discarded) {
					continue;
				}

				const protocol: typeof Protocol | null = await getTabProtocol(tab);
				if (!protocol) {
					continue;
				}

				onTabUpdated(tab.id!, {"url": tab.url});
		}
	}
})
