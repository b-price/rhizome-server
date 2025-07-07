# MusicBrainz Genre/Artist Fetcher

- Retrieves every genre: `/genres`
- Retrieves every artist in a genre and an array of artist links: `/artists/:genre`
- Retrieves last.fm artist data for an artist: `/artists/data/:id/:name`
- Retrieves associated wikimedia images for MB artist: `/artists/image/:id`
- Search last.fm for an artist: `artists/search/:name`
- **WARNING:** for decently popular genres, retrieving artists will take a LONG time
- Try it out on obscure genres like "Ambient Black Metal" for faster results
### Source code setup

- Have node.js installed
- Navigate to project folder
- Create a `.env` file like this:
```dotenv
PORT=3000 # can be whatever port number works for you
APP_NAME=YourApp # anything
APP_VERSION="0.0.1" # a number
APP_CONTACT="youremail@gmail.com" # any email
MB_URL="https://musicbrainz.org/ws/2/" # must be this URL
LASTFM_URL="https://ws.audioscrobbler.com/2.0/" # must be this URL
LASTFM_API_KEY=YOUR_LASTFM_API_KEY # only needed for lastfmArtistData
```
- Run `npm install` to install deps
- Run `npm run dev` to start the server
- Run `npx tsx <file>.ts` to run individual files if needed