let port = browser.runtime.connectNative("firefoxmpris");
port.onMessage.addListener(onMessageReceived);

class VideoProperties {
  PLAYING = "playing";
};

async function runCode(code, tabId, args = []) {
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

async function onMessageReceived(message) {
  let type = message.type;

  console.log("MESSAGE RECEIVED: ", message);

  switch (type) {
    // case "log": {
    //   console.log(message);
    // }

    case "play": {
      await runCode(() => {
        document.querySelector("video").play()
      }, message.tab);
      break;
    }

    case "get_status": {

      let result = await runCode(() => {
        let result = {};
        let video = document.querySelector("video");

        result.playing = !video.paused;
        result.position = video.currentTime;
        result.duration = video.duration;

        return result;
      }, message.tab);

      emitEvent("response", result);
      break;
    }
  
    default: {
      break;
    }
  }
}

function sendMessage(message) {
  try {
    port.postMessage(message);
    console.log("MESSAGE SENT: ", message);
  }
  catch (err) {
    console.log(err);
  }
}

function emitEvent(type, data) {
  let object = {"type": type};
  Object.keys(data).forEach(key => {
    object[key] = data[key];
  })
  sendMessage(JSON.stringify(object));
}

function onTabUpdated(tabId, changeInfo) {
  emitEvent("tab_changed", {"tab": tabId, "url": changeInfo.url});

  runCode((tabId, extensionId, Properties) => {
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

function onTabDeleted(tabId) {
  emitEvent("tab_closed", {"tab": tabId});
}

function onTabConnected(port) {
  port.onMessage.addListener(event => {
    emitEvent("set_property", event);
  })
}

const filter = {
  urls: ["https://www.youtube.com/watch?*"],
  properties: ["url"]
};

browser.tabs.onUpdated.addListener(onTabUpdated, filter);
browser.tabs.onRemoved.addListener(onTabDeleted);

browser.runtime.onConnect.addListener(onTabConnected);

browser.windows.getAll({populate: true}).then(async windows => {
  for (let window of windows) {
    for (let tab of window.tabs) {
        if (tab.discarded) {
          continue;
        }

        if (!tab.url.startsWith("https://www.youtube.com/watch?")) {
          continue;
        }

        const video_exists = await runCode(() => {return document.querySelector("video") != null}, tab.id);
        if (!video_exists) {
          continue;
        }

        onTabUpdated(tab.id, {"url": tab.url});
    }
  }
})
