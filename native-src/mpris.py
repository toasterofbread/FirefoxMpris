#!/usr/bin/python3

import notify2
from typing import Any
from spectre7.browserapi import BrowserAPI
from mpristab import *
from urllib.parse import urlparse, parse_qs

api = BrowserAPI()
tabs = {}

PROGRAM_NAME = "firefoxmpris"

def notify(body, title = PROGRAM_NAME):
    notify2.Notification(str(title), str(body)).show()

def onMessageRecieved(event):

    # notify(event)
    type: str = event.pop("type")

    while True:
        match type:

            # case "notify":
                # notify(event)
            
            case "tab_closed":
                tabs.pop(event["tab"], None)

            case "tab_changed":
            
                url = urlparse(event["url"])

                if url.hostname != "www.youtube.com" or url.path != "/watch":
                    break
                
                if not "v" in parse_qs(url.query):
                    break

                tab_id = event["tab"]
                if tab_id in tabs:
                    tab: Tab = tabs[tab_id]
                    tab.url = url
                    tab.updateInformation() 
                else:
                    tab = Tab(tab_id, api)
                    tabs[tab_id] = tab

            case "update_property":
                tab = tabs[event["tab"]]
                tab.updateProperty(event["key"], event["value"])

            case _:
                api.sendMessage({"type": "log", "err": f"Unhandled event type '{type}' (Event: {event})"})

        break

    return True

class Tab(MprisTab):

    def notify(self, msg):
        api.sendMessage({"type": "log", "msg": msg})

    def __init__(self, tab_id: int, api: BrowserAPI):
        self.id = tab_id
        self.server_name = PROGRAM_NAME + "_" + str(self.id)
        self.api = api

        for property in Tab.PROPERTIES:
            setattr(self, property, None)
        self.updateInformation()

        super().__init__(self.server_name)

        self.setPlayerInterface(PlayerInterface(self))
        self.setTrackInterface(TrackInterface(self))

        self.publish()

        notify("Server created ", self.server_name)

    def __del__(self):
        pass

    def updateInformation(self):
        api.sendMessage({"type": "get_status", "tab": self.id})

        response = api.listenForMessages(lambda message : message["type"] != "response")

        for property in Tab.PROPERTIES:

            if not property in response:
                msg = f"get_status response missing property '{property}'"
                notify(msg)
                api.sendMessage({"type": "log", "error": msg})
                exit()
            elif not isinstance(response[property], Tab.PROPERTIES[property]):
                msg = f"get_status response property {{{property}: {response[property]}}} is not of type '{str(Tab.PROPERTIES[property])}'"
                notify(msg)
                api.sendMessage({"type": "log", "error": msg})
                exit()

            setattr(self, property, response[property])
    
    def updateProperty(self, key: str, value: Any):
        if not key in Tab.PROPERTIES:
            raise KeyError(f"Property '{key}' does not exist")
        setattr(self, key, value)

if __name__ == "__main__":
    notify2.init("firefoxmpris")

    MprisServer.runLoopInThread()

    try:
        api.setCallback(onMessageRecieved)
        api.listenForMessages()
    except Exception as e:
        msg: str = str(e)
        notify(msg);
        api.sendMessage({"type": "log", "error": msg})
    finally:
        MprisServer.LOOP.quit()
