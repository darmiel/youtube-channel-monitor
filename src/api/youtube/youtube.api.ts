import { OAuth2Client } from "google-auth-library";
import { YouTubeDataBackend } from "./youtube.backend.api";

import { google, youtube_v3 } from "googleapis";

export class YouTubeV3 extends YouTubeDataBackend {
  public service: youtube_v3.Youtube | null = null;

  constructor() {
    super();
  }

  protected onReady(client: OAuth2Client): void {
    this.service = google.youtube("v3");

    console.log("Get channel ...");
    if (this.service != null && this.client != null) {
      console.log("Yeah, should work!");

      this.service.videos.list({
        auth: this.client,

      });
    }
  }

  public isReady(): boolean {
    return this.service != null;
  }
}
