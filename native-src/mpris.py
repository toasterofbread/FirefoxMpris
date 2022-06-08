#!/usr/bin/python3
import traceback
import notify2
from typing import Any
from spectre7.browserapi import BrowserAPI
from mpristab import *
import logging

api = BrowserAPI()
tabs = {}

PROGRAM_NAME = "firefoxmpris"

def notify(body, title = PROGRAM_NAME):
    notify2.Notification(str(title), str(body)).show()

def onMessageRecieved(event):
    type: str = event.pop("type")

    while True:
        match type:

            case "echo":
                api.sendMessage(event)

            case "tab_closed":
               tab = tabs.pop(event["tab"], None)
               if tab:
                   tab.delete()

            case "tab_changed":
            
                tab_id = event["tab"]
                if not event["supported"]:
                    tab = tabs.pop(tab_id, None)
                    if tab:
                        tab.delete()
                    break

                api.sendMessage({"type": "update_tab", "tab": tab_id})
                
            case "update_tab":
                tab_id = event["tab"]

                if tab_id in tabs:
                    tab: Tab = tabs[tab_id]
                    tab.url = event["url"]
                    tab.updateInformation(event)
                else:
                    tab = Tab(tab_id, api, event)
                    tabs[tab_id] = tab

            case "property_changed":
                if not event["tab"] in tabs:
                    break

                tab = tabs[event["tab"]]
                tab.propertyChanged(event["key"], event["value"])

            case _:
                api.sendMessage({"type": "log", "err": f"Unhandled event type '{type}' (Event: {event})"})

        break

    return True

class Tab(MprisTab):

    def notify(self, msg):
        api.sendMessage({"type": "log", "msg": msg})

    def __init__(self, tab_id: int, api: BrowserAPI, data: dict):
        self.id = tab_id
        self.server_name = "mp_" + str(self.id)
        self.api = api

        for property in Tab.PROPERTIES:
            setattr(self, property, None)
        self.updateInformation(data)

        super().__init__(self.server_name)

        self.setPlayerInterface(PlayerInterface(self))
        self.setTrackInterface(TrackInterface(self))

        self.notify("Creating server: " + self.server_name)
        self.publish()

    def delete(self):
        self.unpublish()
        self.notify("Server deleted: " + self.server_name)

    def updateInformation(self, data: dict):
        
        updated_properties = []
        for property in Tab.PROPERTIES:

            if not property in data:
                msg = f"updateInformation data missing property '{property}'"
                notify(msg)
                api.sendMessage({"type": "log", "error": msg})
                exit()
            elif not isinstance(data[property], Tab.PROPERTIES[property][0]):
                msg = f"updateInformation data property {{{property}: {data[property]}}} is not of type '{str(Tab.PROPERTIES[property][0])}'"
                notify(msg)
                api.sendMessage({"type": "log", "error": msg})
                exit()

            setattr(self, property, data[property])

            prop = Tab.PROPERTIES[property][1]
            if not prop in updated_properties and self.isPublished():
                updated_properties.append(prop)

                for interface in (self.main_interface, self.player_interface, self.track_interface):
                    if interface is None or not hasattr(interface, prop):
                        continue
                    interface.notifyPropertyChanged(prop)
                    break
        
    def propertyChanged(self, key: str, value: Any):
        if not key in Tab.PROPERTIES:
            raise KeyError(f"Property '{key}' does not exist")
        setattr(self, key, value)
        
        property = Tab.PROPERTIES[key][1]
        for interface in (self.main_interface, self.player_interface, self.track_interface):
            if interface is None or not hasattr(interface, property):
                continue
            interface.notifyPropertyChanged(property)
            break

if __name__ == "__main__":
    notify2.init("firefoxmpris")

    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler("debug.log"),
        ]
    )

    try:
        MprisServer.runLoopInThread()
        api.setCallback(onMessageRecieved)
        api.listenForMessages()
    except Exception as e:
        msg: str = str(e)
        notify(msg);
        api.sendMessage({"type": "log", "error": msg, "traceback": traceback.format_exc()})
    finally:
        MprisServer.LOOP.quit()
