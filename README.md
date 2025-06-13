# MusicBrainz Genre/Artist Fetcher

- Retrieves every genre: `/genres`
- Retrieves every artist in a genre and an array of artist links: `/artists/:genre`
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
```
- Run `npm install` to install deps
- Run `npm run dev` to start the server