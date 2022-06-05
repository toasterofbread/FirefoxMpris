import { Protocol } from "../protocol.js"
import { runCode } from "../background.js"

export class YoutubeProtocol extends Protocol {
    static async supportsTab(tab: any): Promise<boolean> {

        if (!tab.url.startsWith("https://www.youtube.com/watch?")) {
            return false;
        }

        const video_exists = await runCode(() => {return document.querySelector("video") != null}, tab.id);
        if (!video_exists) {
          return false;
        }

        return true;
    }
}