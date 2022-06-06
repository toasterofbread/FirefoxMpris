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

    PROPERTIES = {
        "status": [int, "PlaybackStatus"],
        "fullscreen": [bool, "Fullscreen"],
        "loop": [bool, "LoopStatus"],
        "is_playlist": [bool, "LoopStatus"],
        "shuffle": [bool, "Shuffle"],
        "volume": [float, "Volume"],
        "position": [float | int, "Position"],
        "playback_rate": [float | int, "Rate"],

        "track_id": [None | str, "Metadata"],
        "duration": [None | float | int, "Metadata"],
        "art_url": [None | str, "Metadata"],
        "url": [None | str, "Metadata"],
        "title": [None | str, "Metadata"],
        "album_name": [None | str, "Metadata"],
        "disc_number": [None | int, "Metadata"],
        "track_number": [None | int, "Metadata"],
        "artists": [None | list, "Metadata"],
        "album_artists": [None | list, "Metadata"],
        "comments": [None | list, "Metadata"],
        
        "CanQuit": [bool, "CanQuit"],
        "CanRaise": [bool, "CanRaise"],
        "CanSetFullscreen": [bool, "CanSetFullscreen"],
        "Identity": [str, "Identity"],
        "DesktopEntry": [str, "DesktopEntry"],
        "SupportedUriSchemes": [list, "SupportedUriSchemes"],
        "SupportedMimeTypes": [list, "SupportedMimeTypes"],

        "can_go_next": [bool, "CanGoNext"],
        "can_go_previous": [bool, "CanGoPrevious"],
        "can_play": [bool, "CanPlay"],
        "can_pause": [bool, "CanPause"],
        "can_seek": [bool, "CanSeek"],
        "can_control": [bool, "CanControl"],
    }

    HasTrackList = True

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
            "mpris:trackid": self.tab.track_id,
            "mpris:length": self.tab.duration * self.TIME_UNIT,
            "mpris:artUrl": self.tab.art_url,
            "xesam:url": self.tab.url,
            "xesam:title": self.tab.title,
            "xesam:album": self.tab.album_name,
            "xesam:discNumber": self.tab.disc_number,
            "xesam:trackNumber": self.tab.track_number,
            "xesam:artist": self.tab.artists,
            "xesam:albumArtist": self.tab.album_artists,
            "xesam:comment": self.tab.comments,
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
        # return ("Stopped", "Paused", "Playing")[self.tab.status]
        return "Playing"

    @property
    def LoopStatus(self) -> str: # -> "Track" | "Playlist" | "None"
        if self.tab.loop:
            return "Track"
        elif self.tab.is_playlist:
            return "Playlist"
        return "None"

    @LoopStatus.setter
    def LoopStatus(self, value: str): # value: "Track" | "Playlist" | "None"
        if not self.CanControl:
            return
        self.tab.setProperty(name(), value)

    @property
    def Rate(self) -> float:
        return self.tab.playback_rate

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
    def Position(self) -> int:
        return int(self.tab.position * self.TIME_UNIT)

    @property
    def CanGoNext(self) -> bool:
        if not self.CanControl:
            return False
        return self.tab.can_go_next

    @property
    def CanGoPrevious(self) -> bool:
        if not self.CanControl:
            return False
        return self.tab.can_go_previous

    @property
    def CanPlay(self) -> bool:
        if not self.CanControl:
            return False
        return self.tab.can_play

    @property
    def CanPause(self) -> bool:
        if not self.CanControl:
            return False
        return self.tab.can_pause

    @property
    def CanSeek(self) -> bool:
        if not self.CanControl:
            return False
        return self.tab.can_seek

    @property
    def CanControl(self) -> bool:
        return self.tab.can_control

class TrackInterface(MprisTrackInterface):
    def __init__(self, tab: MprisTab):
        self.tab = tab