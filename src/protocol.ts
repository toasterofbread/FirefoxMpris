import { runCode } from "./background.js"

export var run = runCode;

export class Protocol {

    tabId: number

    constructor(tabId: number) {
        this.tabId = tabId;
    }

    protected static async supportsTab(tab: browser.tabs.Tab): Promise<boolean> { return false; }

    protected async runCode(code: CallableFunction, args: any[] = []) {
        return runCode(code, this.tabId, args);
    }

    protected async runQueryCode(query: string, code: (element: any) => any) {
        return runCode((query: string, code: (element: any) => any) => {
            return code(document.querySelector(query)!)
        }, this.tabId, [query, code]);
    }

    protected async getFullStatus(): Promise<any> {}

    public async getURL(): Promise<string> {
        return (await browser.tabs.get(this.tabId)).url!;
    }

    public async quit(): Promise<void> {
        return browser.tabs.remove(this.tabId);
    }

    protected async play(): Promise<void> {}
    protected async pause(): Promise<void> {}
    protected async next(): Promise<void> {}
    protected async previous(): Promise<void> {}
    protected async stop(): Promise<void> {}

    protected async getLooping(): Promise<boolean> { return false; }
    protected async setLooping(value: boolean): Promise<void> {}

    protected async getMuted(): Promise<boolean> { return false; }
    protected async setMuted(value: boolean): Promise<void> {}
    
    protected async getPlaybackRate(): Promise<number> { return -1; }
    protected async setPlaybackRate(value: number): Promise<void> {}

    protected async getPosition(): Promise<number> { return -1; }
    protected async setPosition(value: number): Promise<void> {}

    protected async getShuffle(): Promise<boolean> { return false; }
    protected async setShuffle(value: boolean): Promise<void> {}

    protected async getPlaying(): Promise<boolean> { return false; }
    protected async getDuration(): Promise<number> { return -1; }
    protected async getTitle(): Promise<string> { return ""; }
    protected async getArtist(): Promise<string> { return ""; }
    protected async getArtURL(): Promise<string> { return ""; }
    protected async getAlbum(): Promise<string> { return ""; }
    protected async getTrackNumber(): Promise<number> { return -1; }
    protected async isPlaylist(): Promise<boolean> { return false; }

    protected async canGoNext(): Promise<boolean> { return false; }
    protected async canGoPrevious(): Promise<boolean> { return false; }
    protected async canPlay(): Promise<boolean> { return false; }
    protected async canPause(): Promise<boolean> { return false; }
    protected async canSeek(): Promise<boolean> { return false; }
}

export class VideoProtocol extends Protocol {

    public async play(): Promise<void> {
        return this.runQueryCode("video", (video: HTMLVideoElement) => {
            return video.play();
        })
    }
    
    public async pause(): Promise<void> {
        return this.runQueryCode("video", (video: HTMLVideoElement) => {
            return video.pause();
        })
    }

    protected async stop(): Promise<void> {
        return this.pause();
    }

    public async getPlaying(): Promise<boolean> {
        return await this.runQueryCode("video", (video: HTMLVideoElement) => {
            return !video.paused;
        })
    }

    public async getPosition(): Promise<number> {
        return await this.runQueryCode("video", (video: HTMLVideoElement) => {
            return video.currentTime;
        })
    }

    public async getDuration(): Promise<number> {
        return await this.runQueryCode("video", (video: HTMLVideoElement) => {
            return video.duration;
        })
    }
    
    public async getLooping(): Promise<boolean> {
        return await this.runQueryCode("video", (video: HTMLVideoElement) => {
            return video.loop;
        })
    }

    public async getMuted(): Promise<boolean> {
        return await this.runQueryCode("video", (video: HTMLVideoElement) => {
            return video.muted;
        })
    }

    public async getPlaybackRate(): Promise<number> {
        return await this.runQueryCode("video", (video: HTMLVideoElement) => {
            return video.playbackRate;
        })
    }

    public async canPlay(): Promise<boolean> { return true; }
    public async canPause(): Promise<boolean> { return true; }
    public async canSeek(): Promise<boolean> { return true; }

}