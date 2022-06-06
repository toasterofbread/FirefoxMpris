import { runCode, VideoProperties } from "./background.js"

export class Protocol {

    tabId: number

    constructor(tabId: number) {
        this.tabId = tabId;
    }

    protected static async supportsTab(tab: browser.tabs.Tab): Promise<boolean> { return false; }
    
    public async callMethod(name: string, args: any[] = []): Promise<boolean> {
        let method: CallableFunction;
        switch (name) {
            case "Raise": method = this.Raise; break;
            case "Quit": method = this.Quit; break;
            case "PlayPause": method = this.PlayPause; break;
            case "Play": method = this.Play; break;
            case "Pause": method = this.Pause; break;
            case "Stop": method = this.Stop; break;
            case "Next": method = this.Next; break;
            case "Previous": method = this.Previous; break;
            case "Seek": method = this.Seek; break;
            case "SetPosition": method = this.SetPosition; break;
            case "OpenUri": method = this.OpenUri; break;
            default: return false;
        }

        // @ts-expect-error
        await method.apply(this, args);

        return true;
    }

    public async setProperty(name: string, value: any): Promise<boolean> {
        let setter: CallableFunction;
        switch (name) {
            case "Fullscreen": setter = this.SetFullscreen; break;
            case "LoopStatus": setter = this.SetLoopStatus; break;
            case "Rate": setter = this.SetPlaybackRate; break;
            case "Shuffle": setter = this.SetShuffle; break;
            case "Volume": setter = this.SetVolume; break;
            default: return false;
        }

        // @ts-expect-error
        await setter.call(this, value);
        return true;
    }

    public async getProperties(current: any = null): Promise<any> {
        current = current || {};
        current[VideoProperties.TRACK_ID] = "/";
        current[VideoProperties.CANQUIT] = true;
        current[VideoProperties.CANRAISE] = true;
        current[VideoProperties.DESKTOPENTRY] = ""; // TODO
        current[VideoProperties.SUPPORTEDURISCHEMES] = ["file"];
        current[VideoProperties.SUPPORTEDMIMETYPES] = ["audio/mpeg", "application/ogg", "video/mpeg"];
        return current;
    }

    protected async runCode(code: CallableFunction, args: any[] = []) {
        return runCode(code, this.tabId, args);
    }

    protected async getFullStatus(): Promise<any> {}

    public async getURL(): Promise<string> {
        return (await browser.tabs.get(this.tabId)).url!;
    }

    public async Raise(): Promise<void> {
        await browser.tabs.update(this.tabId, {active: true});
    }

    public async Quit(): Promise<void> {
        return browser.tabs.remove(this.tabId);
    }

    protected async Seek(offset: number): Promise<void> {}
    protected async SetPosition(track_id: string, value: number): Promise<void> {}
    protected async OpenUri(uri: string): Promise<void> {}

    protected async PlayPause(): Promise<void> {}
    protected async Play(): Promise<void> {}
    protected async Pause(): Promise<void> {}
    protected async Next(): Promise<void> {}
    protected async Previous(): Promise<void> {}
    protected async Stop(): Promise<void> {}

    protected async SetFullscreen(value: boolean): Promise<void> {}
    protected async SetLoopStatus(value: string): Promise<void> {}
    protected async SetPlaybackRate(value: number): Promise<void> {}
    protected async SetShuffle(value: boolean): Promise<void> {}
    protected async SetVolume(value: number): Promise<void> {}
}

export class VideoProtocol extends Protocol {

    /*
       Unhandled:
        IS_PLAYLIST
        SHUFFLE
        ART_URL
        TITLE
        ALBUM_NAME
        DISC_NUMBER
        TRACK_NUMBER
        ARTISTS
        ALBUM_ARTISTS
        COMMENTS
        IDENTITY
	    CANGONEXT
	    CANGOPREVIOUS
    */


    public async getProperties(current: any = null): Promise<any> {
        current = await super.getProperties(current);
        return await this.runCode((current: any, props: typeof VideoProperties) => {
        
            const video: HTMLVideoElement = document.querySelector("video")!;
        
            current[props.STATUS] = video.ended ? 0 : video.paused ? 1 : 2;
            current[props.FULLSCREEN] = document.fullscreenElement == document.documentElement;
            current[props.LOOP] = video.loop;
            current[props.VOLUME] = video.volume;
            current[props.POSITION] = video.currentTime;
            current[props.PLAYBACK_RATE] = video.playbackRate;
            current[props.DURATION] = video.duration;
            current[props.URL] = document.URL;
            current[props.CANSETFULLSCREEN] = true;
        
            current[props.CAN_PLAY] = true;
            current[props.CAN_PAUSE] = true;
            current[props.CAN_SEEK] = true;
            current[props.CAN_CONTROL] = true;
            
            return current;
        
        }, [current, VideoProperties])
    }

    public async PlayPause(): Promise<void> {
        return this.runCode(() => {
            const video = document.querySelector("video");
            if (video) {
                if (video.paused) {
                    video.play()
                }
                else {
                    video.pause()
                }
            }
        })
    }

    public async Play(): Promise<void> {
        return this.runCode(() => {
            document.querySelector("video")?.play();
        })
    }
    
    public async Pause(): Promise<void> {
        return this.runCode(() => {
            document.querySelector("video")?.pause();
        })
    }

    protected async Stop(): Promise<void> {
        return this.Pause();
    }

}