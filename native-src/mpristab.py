from spectre7.mprisserver import *
import inspect

def name():
    return inspect.stack()[1][3]

class MprisTab(MprisServer, MprisMainInterface):
    
    def __init__(self, name: str):
        super().__init__(name)
        self.setMainInterface(self)

    def setProperty(self, property: str, value: any):
        self.api.sendMessage({"type": "mpris_set", "tab": self.id, "property": property, "value": value})

    def callMethod(self, method: str, args: list[any] = []):
        self.api.sendMessage({"type": "mpris_method", "tab": self.id, "method": method, "args": args})

    PLAYBACK_STATUS = ("Stopped", "Paused", "Playing")
    PROPERTIES = {
        "status": int,
        "position": float | int,
        "duration": float | int,
        "url": str,
        "fullscreen": bool,
        "track_loop": bool,
        "playlist_loop": bool,
        "is_playlist": bool,
        "playback_speed": float | int,
        "shuffle": bool,
        "volume": float
    }

    CanQuit = True
    CanRaise = True
    CanSetFullscreen = True
    HasTrackList = True
    Identity = ""
    DesktopEntry = ""
    SupportedUriSchemes = ["file"]
    SupportedMimeTypes = ["audio/mpeg", "application/ogg", "video/mpeg"]

    def Raise(self):
        self.callMethod(name())

    def Quit(self):
        self.callMethod(name())

    @property
    def Fullscreen(self):
        return self.fullscreen

    @Fullscreen.setter
    def Fullscreen(self, value: bool):
        self.setProperty(name(), value)

class PlayerInterface(MprisPlayerInterface):

    def __init__(self, tab: MprisTab):
        self.tab = tab

    @property
    def Metadata(self) -> dict:
        ret = {
            "mpris:trackid": "/track/1",
            "mpris:length": self.tab.duration * self.TIME_UNIT,
            "mpris:artUrl": "Example",
            "xesam:url": self.tab.url,
            "xesam:title": "Example title",
            "xesam:album": "Album name",
            "xesam:discNumber": None,
            "xesam:trackNumber": None,
            "xesam:artist": [],
            "xesam:albumArtist": [],
            "xesam:comment": [],
        }
        self.formatMetadata(ret)
        return ret
    
    MinimumRate = 1.0
    MaximumRate = 1.0

    def PlayPause(self):
        self.tab.callMethod(name())

    def Play(self):
        if not self.CanPlay:
            return
        self.tab.callMethod(name())
    
    def Pause(self):
        if not self.CanPause:
            return
        self.tab.callMethod(name())

    def Stop(self):
        if not self.CanControl:
            return
        self.tab.callMethod(name())

    def Next(self):
        if not self.CanGoNext:
            return
        self.tab.callMethod(name())

    def Previous(self):
        if not self.CanGoPrevious:
            return
        self.tab.callMethod(name())

    def Seek(self, offset: int):
        if not self.CanSeek:
            return
        self.tab.callMethod(name(), [offset])

    def SetPosition(self, track_id: str, position: int):
        if not self.CanSeek:
            return
        self.tab.callMethod(name(), [track_id, position])

    def OpenUri(self, uri: str):
        if not self.CanControl:
            return
        self.tab.callMethod(name(), [uri])

    @property
    def PlaybackStatus(self) -> str: # -> "Playing" | "Paused" | "Stopped"
        return self.tab.PLAYBACK_STATUS[self.tab.status]

    @property
    def LoopStatus(self) -> str: # -> "Track" | "Playlist" | "None"
        if self.tab.track_loop:
            return "Track"
        elif self.tab.playlist_loop:
            return "Playlist"
        return "None"

    @LoopStatus.setter
    def LoopStatus(self, value: str): # value: "Track" | "Playlist" | "None"
        if not self.CanControl:
            return
        self.tab.setProperty(name(), value)

    @property
    def Rate(self) -> float:
        return self.tab.playback_speed

    @Rate.setter
    def Rate(self, value: float):
        if not self.CanControl:
            return
        self.tab.setProperty(name(), value)

    @property
    def Shuffle(self) -> bool:
        return self.tab.shuffle

    @Shuffle.setter
    def Shuffle(self, value: bool):
        if not self.CanControl:
            return
        self.tab.setProperty(name(), value)

    @property
    def Volume(self) -> float:
        return self.tab.volume

    @Volume.setter
    def Volume(self, value: float):
        if not self.CanControl:
            return
        self.tab.setProperty(name(), value)

    @property
    def Position(self):
        return self.tab.position * self.TIME_UNIT

    @property
    def CanGoNext(self) -> bool:
        if not self.CanControl:
            return False
        return True

    @property
    def CanGoPrevious(self) -> bool:
        if not self.CanControl:
            return False
        return True

    @property
    def CanPlay(self) -> bool:
        if not self.CanControl:
            return False
        return True

    @property
    def CanPause(self) -> bool:
        if not self.CanControl:
            return False
        return True

    @property
    def CanSeek(self) -> bool:
        if not self.CanControl:
            return False
        return True

    @property
    def CanControl(self) -> bool:
        return True

class TrackInterface(MprisTrackInterface):
    def __init__(self, tab: MprisTab):
        self.tab = tab