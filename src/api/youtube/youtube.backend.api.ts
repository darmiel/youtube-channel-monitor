import * as fs from "fs";
import * as readline from "readline";

import { Credentials, OAuth2Client } from "google-auth-library";
import { EventEmitter } from "events";

const TOKEN_DIR = "./.credentials/";
const TOKEN_PATH = TOKEN_DIR + "youtube-credentials.json";

const SCOPES: string[] = ["https://www.googleapis.com/auth/youtube.readonly"];

export interface ClientSecret {
  installed: Installed;
}

export interface Installed {
  client_id: string;
  project_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_secret: string;
  redirect_uris: string[];
}

export abstract class YouTubeDataBackend extends EventEmitter {
  public client: OAuth2Client | null = null;

  constructor() {
    super();

    this.loadFromLocalSecret().then((client) => {
      this.client = client;

      this.emit("ready", this.client);
      this.onReady(this.client);
    });
  }

  protected abstract onReady(client: OAuth2Client): void;

  public isReady(): boolean {
    return this.client != null;
  }

  private async loadFromLocalSecret(): Promise<OAuth2Client> {
    return new Promise((accept, reject) => {
      // Load client secrets from a local file.
      fs.readFile(
        TOKEN_DIR + "client_secret.json",
        "utf-8",
        (err, content) => {
          if (err) {
            console.error("Error loading client secret file: " + err);
            reject(err);
            return;
          }

          // Authorize a client with the loaded credentials, then call the YouTube API.
          this.authorize(JSON.parse(content)).then((client) => {
            accept(client);
          });
        }
      );
    });
  }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   *
   * @param {ClientSecret} credentials The authorization client credentials.
   */
  private async authorize(credentials: ClientSecret): Promise<OAuth2Client> {
    return new Promise((accept) => {
      const clientSecret = credentials.installed.client_secret;
      const clientId = credentials.installed.client_id;
      const redirectUrl = credentials.installed.redirect_uris[0];
      const oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUrl
      );

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, "utf-8", (err, token) => {
        if (err) {
          this.getNewToken(oauth2Client).then((client) => {
            accept(client);
          });
        } else {
          oauth2Client.credentials = JSON.parse(token);
          accept(oauth2Client);
        }
      });
    });
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   *
   * @param {OAuth2Client} oauth2Client The OAuth2 client to get token for.
   */
  private async getNewToken(oauth2Client: OAuth2Client): Promise<OAuth2Client> {
    return new Promise((accept) => {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
      });

      console.log("Authorize this app by visiting this url: ", authUrl);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question("Enter the code from that page here: ", (code: string) => {
        rl.close();

        oauth2Client.getToken(code, (err, token?: Credentials | null) => {
          if (err) {
            console.log("Error while trying to retrieve access token", err);
            return;
          }

          if (token != null) {
            oauth2Client.credentials = token;

            this.storeToken(token).then(() => {
              accept(oauth2Client);
            });
          }
        });
      });
    });
  }

  /**
   * Store token to disk be used in later program executions.
   *
   * @param {Credentials} token The token to store to disk.
   */
  private async storeToken(token: Credentials): Promise<void> {
    return new Promise((accept) => {
      try {
        fs.mkdirSync(TOKEN_DIR);
      } catch (err) {
        if (err.code != "EEXIST") {
          accept();
          throw err;
        }
      }
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err;
        console.log("Token stored to " + TOKEN_PATH);
        accept();
      });
    });
  }
}
