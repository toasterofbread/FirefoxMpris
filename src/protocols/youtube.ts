import { VideoProtocol, run } from "../protocol.js"

export class YoutubeProtocol extends VideoProtocol {

    public static async supportsTab(tab: browser.tabs.Tab): Promise<boolean> {
        const url = new URL(tab.url!);

        if (url.hostname != "www.youtube.com") {
            return false
        }

        if (!url.searchParams.has("v")) {
            return false;
        }

        return await run(() => {return document.querySelector("video") != null}, tab.id!);
    }

    public async getTitle(): Promise<string> {
        const title: string = (await browser.tabs.get(this.tabId)).title!;
        return title.substring(0, title.length - 10);
    }

    public async getArtist(): Promise<string> {
        return await this.runQueryCode(".style-scope ytd-channel-name", (element: HTMLElement) => {
            return element.querySelector(".style-scope yt-formatted-string")?.textContent;
        })
    }

    public async getArtURL(): Promise<string> { return ""; }
    public async getAlbum(): Promise<string> { return ""; }
    public async getTrackNumber(): Promise<number> { return -1; }
    public async isPlaylist(): Promise<boolean> { return false; }

}