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

        current[VideoProperties.CAN_PLAY] = await this.CanPlay();
        current[VideoProperties.CAN_PAUSE] = await this.CanPause();
        current[VideoProperties.CAN_SEEK] = await this.CanSeek();
        current[VideoProperties.CAN_CONTROL] = await this.CanControl();

        current[VideoProperties.CAN_GO_NEXT] = await this.CanGoNext();
        current[VideoProperties.CAN_GO_PREVIOUS] = await this.CanGoPrevious();

        current[VideoProperties.CANSETFULLSCREEN] = await this.CanSetFullscreen();

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
    protected async SetPosition(track_id: string, position: number): Promise<void> {}
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

    protected async CanPlay(): Promise<boolean> { return false; }
    protected async CanPause(): Promise<boolean> { return false; }
    protected async CanSeek(): Promise<boolean> { return false; }
    protected async CanControl(): Promise<boolean> { return false; }
    protected async CanGoNext(): Promise<boolean> { return false; }
    protected async CanGoPrevious(): Promise<boolean> { return false; }
    protected async CanSetFullscreen(): Promise<boolean> { return false; }
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

    public async Stop(): Promise<void> {
        return this.Pause();
    }

    public async Seek(offset: number): Promise<void> {
        const go_next: boolean = await this.runCode((offset: number) => {
            const video: HTMLVideoElement = document.querySelector("video")!;
            const target: number = Math.max(0, video.currentTime + offset);

            if (target > video.duration) {
                return true;
            }

            video.currentTime = target;
            return false;
        }, [offset])

        if (go_next) {
            return this.Next();
        }
    }
    
    public async SetPosition(_track_id: string, position: number): Promise<void> {

        if (position < 0 || !(await this.CanSeek())) {
            return;
        }
        
        return this.runCode((position: number) => {
            const video: HTMLVideoElement = document.querySelector("video")!;
            if (position > video.duration) {
                return;
            }
            video.currentTime = position;
        }, [position]);
    }

    public async SetFullscreen(value: boolean): Promise<void> {

        if (!(await this.CanSetFullscreen())) {
            return;
        }

        return this.runCode((fullscreen: boolean) => {
            if (!document.fullscreenEnabled) {
                return;
            }

            const video: HTMLVideoElement = document.querySelector("video")!;
            if (fullscreen) {
                video.requestFullscreen()
            }
            else {
                document.exitFullscreen();
            }
        }, [value]);
    }

    public async CanPlay(): Promise<boolean> {
        return true;
    }

    public async CanPause(): Promise<boolean> {
        return true;
    }

    public async CanSeek(): Promise<boolean> {
        return true;
    }

    public async CanControl(): Promise<boolean> {
        return true;
    }

    public async CanSetFullscreen(): Promise<boolean> { 
        return true;
    }
    
}