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

class VideoProperties {
	STATUS = "status";
	POSITION = "position";
	DURATION = "duration";
	URL = "url";
	FULLSCREEN = "fullscreen";
	TRACK_LOOP = "track_loop";
	PLAYLIST_LOOP = "playlist_loop";
	IS_PLAYLIST = "is_playlist";
	PLAYBACK_SPEED = "playback_speed";
	SHUFFLE = "shuffle";
	VOLUME = "volume";
};

export async function runCode(code: CallableFunction, tabId: number, args: any[] = []) {
	// @ts-expect-error
	let result = (await browser.scripting.executeScript({
		target: {
			tabId: tabId
		},
		func: code,
		args: args
	}))[0];

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
	let object: any = {"type": type};
	Object.keys(data).forEach(key => {
		object[key] = data[key];
	})
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
		// case "log": {
		//   console.log(message);
		// }

		case "play": {
			await runCode(() => {
				document.querySelector("video")?.play()
			}, message.tab);
			break;
		}

		case "get_status": {

/*
    PROPERTIES = {
        "status": int,
        "position": int,
        "duration": int,
        "url": str,
        "fullscreen": bool,
        "track_loop": bool,
        "playlist_loop": bool,
        "is_playlist": bool,
        "playback_speed": float,
        "shuffle": bool,
        "volume": float
    }
*/

			let result = await runCode(() => {
				const video: HTMLMediaElement = document.querySelector("video")!;
			  	return {
					"status": video.ended ? 0 : video.paused ? 1 : 2,
					"position": video.currentTime,
					"duration": video.duration,
					"url": document.URL,
					// @ts-expect-error
					"fullscreen": Document.fullscreenElement == video,
					"track_loop": video.loop,
					"playlist_loop": false,
					"is_playlist": false,
					"playback_speed": video.playbackRate,
					"shuffle": false,
					"volume": video.volume
				};
			}, message.tab);

			emitEvent("response", result);
			break;
		}

		case "raise_tab": {
			browser.tabs.update(message.tab, {active: true});
			break;
		}
	
		default: {
			break;
		}
	}
}

function onTabUpdated(tabId: number, changeInfo: any) {
	emitEvent("tab_changed", {"tab": tabId, "url": changeInfo.url});

	runCode((tabId: number, extensionId: string, Properties: VideoProperties) => {
		let video = document.querySelector("video");
		if (!video) {
			return;
		}

		// Register video events
		video.addEventListener("pause", () => {
			const video: HTMLMediaElement = document.querySelector("video")!;
			let port = browser.runtime.connect({name: extensionId})
			port.postMessage({key: Properties.STATUS, value: video.ended ? 0 : video.paused ? 1 : 2, tab: tabId});
		})

		video.addEventListener("play", () => {
			const video: HTMLMediaElement = document.querySelector("video")!;
			let port = browser.runtime.connect({name: extensionId})
			port.postMessage({key: Properties.STATUS, value: video.ended ? 0 : video.paused ? 1 : 2, tab: tabId});
		})

	}, tabId, [tabId, browser.runtime.id, new VideoProperties])
}

function onTabDeleted(tabId: number) {
	emitEvent("tab_closed", {"tab": tabId});
}

function onTabConnected(port: browser.runtime.Port) {
	port.onMessage.addListener((event: any) => {
		emitEvent("update_property", event);
	})
}

const filter = {
	urls: ["https://www.youtube.com/watch?*"],
	properties: ["url"]
};

// @ts-expect-error
browser.tabs.onUpdated.addListener(onTabUpdated, filter);
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

				// console.log(await runCode(() => {
				// 	let el: HTMLElement = document.querySelector(".style-scope ytd-channel-name")!;
				// 	el = el.querySelector(".style-scope yt-formatted-string")!;

				// 	return el.innerText;

				// }, tab.id!));
				// return;

				onTabUpdated(tab.id!, {"url": tab.url});
		}
	}
})
