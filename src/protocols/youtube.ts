import { VideoProtocol } from "../protocol.js"
import { runCode, VideoProperties } from "../background.js";

export class YoutubeProtocol extends VideoProtocol {

    public static async supportsTab(tab: browser.tabs.Tab): Promise<boolean> {
        const url = new URL(tab.url!);

        if (url.hostname != "www.youtube.com") {
            return false
        }

        if (!url.searchParams.has("v")) {
            return false;
        }

        return await runCode(() => {return document.querySelector("video") != null}, tab.id!);
    }

    public async getProperties(current: any = null): Promise<any> {
        current = await super.getProperties(current);
        return await this.runCode(async (current: any, props: typeof VideoProperties) => {

            const channel: HTMLAnchorElement | null | undefined = document.querySelector(".style-scope ytd-channel-name")?.querySelector("a");
            const video_url = new URL(document.URL);
            const video_id = video_url.searchParams.get("v");

            current[props.SHUFFLE] = false;
            current[props.ART_URL] = `https://img.youtube.com/vi/${video_id}/mqdefault.jpg`;
            current[props.TITLE] = document.title;
            current[props.ALBUM_NAME] = null;
            current[props.DISC_NUMBER] = null;
            current[props.TRACK_NUMBER] = null;
            current[props.ARTISTS] = [channel?.textContent];
            current[props.COMMENTS] = [JSON.stringify({
                channel_url: channel?.href,
                video_id: video_id,
                playlist_id: video_url.searchParams.get("list") || undefined
            })];
            current[props.IDENTITY] = "YouTube";

            const next_btn = document.querySelector(".ytp-next-button");
            current[props.CAN_GO_NEXT] = next_btn?.getAttribute("aria-disabled") == "false";

            const prev_btn = document.querySelector(".ytp-prev-button");
            current[props.CAN_GO_PREVIOUS] = prev_btn?.getAttribute("aria-disabled") == "false";

            const playlist_items = document.querySelector("ytd-playlist-panel-renderer.style-scope.ytd-watch-flexy[id='playlist'] div[id='items']");
            
            if (playlist_items) {
                current[props.IS_PLAYLIST] = true;
                current[props.ALBUM_ARTISTS] = []

                let i = -1;
                for (let item of Array.from(playlist_items.children)) {
                    i ++;

                    if (current[props.TRACK_NUMBER] == null) {
                        const item_href = item.querySelector("a")?.href;
                        if (item_href) {
                            const url = new URL(item_href);
                            if (url.searchParams.get("v") == video_id) {
                                current[props.TRACK_NUMBER] = i;
                            }
                        }
                    }

                    const artist = item.querySelector("span[id='byline']")?.textContent;
                    if (!artist || current[props.ALBUM_ARTISTS].includes(artist)) {
                        continue;
                    }
                    current[props.ALBUM_ARTISTS].push(artist);
                }
            }
            else {
                current[props.IS_PLAYLIST] = false;
                current[props.ALBUM_ARTISTS] = current[props.ARTISTS];
            }

            return current;
        
        }, [current || {}, VideoProperties])
    }

    public async Next(): Promise<void> {
        return this.runCode(() => {
            const next_btn: HTMLElement | null = document.querySelector(".ytp-next-button");
            next_btn?.click();
        })
    }

    public async Previous(): Promise<void> {
        return this.runCode(() => {
            const prev_btn: HTMLElement | null = document.querySelector(".ytp-prev-button");
            prev_btn?.click();
        })
    }

}