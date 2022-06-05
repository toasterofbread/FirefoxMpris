import { YoutubeProtocol } from "./protocols/youtube.js";

const PROTOCOLS = [
  YoutubeProtocol
];

async function getTabProtocol(tabId: any) {
  for (let protocol of PROTOCOLS) {
    if (await protocol.supportsTab(tabId)) {
      return protocol;
    }
  }
  return null;
}

let port = browser.runtime.connectNative("firefoxmpris");
port.onMessage.addListener(onMessageReceived);

class VideoProperties {
  PLAYING = "playing";
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

      let result = await runCode(() => {
        let result: any = {};

        const video: HTMLMediaElement = document.querySelector("video")!;
        result.playing = !video.paused;
        result.position = video.currentTime;
        result.duration = video.duration;

        return result;
      }, message.tab);

      const tab = await browser.tabs.get(message.tab);
      // result.url = tab.url;

      emitEvent("response", result);
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
      let port = browser.runtime.connect({name: extensionId})
      port.postMessage({key: Properties.PLAYING, value: false, tab: tabId});
    })

    video.addEventListener("play", () => {
      let port = browser.runtime.connect({name: extensionId})
      port.postMessage({key: Properties.PLAYING, value: true, tab: tabId});
    })

  }, tabId, [tabId, browser.runtime.id, new VideoProperties])
}

function onTabDeleted(tabId: number) {
  emitEvent("tab_closed", {"tab": tabId});
}

function onTabConnected(port: browser.runtime.Port) {
  port.onMessage.addListener((event: any) => {
    emitEvent("set_property", event);
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

        const protocol = await getTabProtocol(tab);
        console.log(protocol);
        continue;

        if (!protocol) {
          continue;
        }

        onTabUpdated(tab.id!, {"url": tab.url});
    }
  }
})
