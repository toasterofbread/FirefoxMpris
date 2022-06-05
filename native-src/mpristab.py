import mpris_server as MP
from mpris_server.base import URI, MIME_TYPES
from mpris_server.adapters import MprisAdapter, PlayState
from mpris_server.events import EventAdapter as MprisEventAdapter
from mpris_server.server import Server as MprisServer
from typing import List
import json

class MprisTab(MprisAdapter):

    def createServer(self):
        self.server = MprisServer(self.server_name, adapter=self)
        self.server.publish()
        # event_handler = EventHandler(root=server.root, player=server.player)
        self.server.loop()

    def get_uri_schemes(self) -> List[str]:
        return URI

    def get_mime_types(self) -> List[str]:
        return MIME_TYPES

    def can_quit(self) -> bool:
        return True

    def quit(self):
        return ""
    
    def get_current_position(self):
        return 0

    def next(self):
        return ""
    
    def previous(self):
        return ""
    
    def pause(self):
        print("pause")
        return ""
    
    def resume(self):
        print("resume")
        return ""
    
    def stop(self):
        return ""
    
    def play(self):
        return ""
        
    def get_playstate(self) -> PlayState:
        # return PlayState.STOPPED
        # return PlayState.PAUSED
        return PlayState.PLAYING

    def seek(self, time):
        return ""

    def is_repeating(self) -> bool:
        return False

    def is_playlist(self) -> bool:
        return False

    def set_repeating(self, val: bool):
        return ""

    def set_loop_status(self, val: str):
        return ""

    def get_rate(self) -> float:
        return 1.0

    def set_rate(self, val: float):
        return ""

    def get_shuffle(self) -> bool:
        return False

    def set_shuffle(self, val: bool):
        return False

    def get_art_url(self, track):
        return "None"

    def get_stream_title(self):
        return "None"

    def is_mute(self) -> bool:
        return False

    def can_go_next(self) -> bool:
        return False

    def can_go_previous(self) -> bool:
        return  False

    def can_play(self) -> bool:
        return True

    def can_pause(self) -> bool:
        return True

    def can_seek(self) -> bool:
        return False

    def can_control(self) -> bool:
        return True

    def get_stream_title(self) -> str:
        return "Test title"

class EventHandler(MprisEventAdapter):
    def on_app_event(self, event: str):
        print(f"Event received: {event}")