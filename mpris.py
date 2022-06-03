#!/usr/bin/python3

from typing import Any
import notify2
from spectre7.browserapi import BrowserAPI
from mpristab import MprisTab
from urllib.parse import urlparse, parse_qs

class Tab:
    pass

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
                    tab = tabs[tab_id]
                else:
                    tab = Tab(tab_id)
                    tabs[tab_id] = tab
                
            
            case "set_property":

                if not event["tab"] in tabs:
                    notify(tabs.keys())
                    break
                
                tab = tabs[event["tab"]]
                tab.setProperty(event["key"], event["value"])
        break

    return True

class Tab(MprisTab):

    PROPERTIES = ("playing", "position", "duration")

    playing = False
    position = 0
    duration = 0

    def __init__(self, tab_id: int):
        self.id = tab_id
        self.server_name = PROGRAM_NAME + "_" + str(self.id)

        self.updateInformation()

    def __del__(self):
        pass

    def updateInformation(self):
        api.sendMessage({"type": "get_status", "tab": self.id})
        response = api.listenForMessages(lambda message : message["type"] != "response")

        for key in Tab.PROPERTIES:
            setattr(self, key, response[key])
        
        # api.sendMessage({"type": "log", "response": response})
    
    def setProperty(self, name: str, value: Any):
        notify(value, name)


if __name__ == "__main__":
    notify2.init("firefoxmpris")

    try:
        api.setCallback(onMessageRecieved)
        api.listenForMessages()
    except Exception as e:
        notify(e);
