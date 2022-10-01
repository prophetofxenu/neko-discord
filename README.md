# neko-discord

A Discord bot for creating [n.eko](https://github.com/m1k1o/neko) rooms on Discord.
To be used with [neko-do](https://github.com/prophetofxenu/neko-do/tree/main).

* Supports all n.eko images (Chrome, Firefox, VLC, and more)
* Easy to specify a specific image, resolution, FPS, and room/admin passwords
* Automatic cleanup two hours after room creation, with a button to extend a current room

This project is not affiliated with the original n.eko project.


## Requirements

* Docker
* Postgres
* An instance of neko-do setup and running
* Discord bot credentials


## Setup

1. Create the database and user in your Postgres server by logging in and running these commands.

```sql
CREATE DATABASE neko_herder_discord;
CREATE USER neko_herder_discord WITH ENCRYPTED PASSWORD '<password here>';
GRANT ALL PRIVILEGES ON DATABASE neko_herder_discord TO neko_herder_discord;
```

2. Login to the neko-do database and create the user with these commands.

```sql
INSERT INTO "Users" VALUES
(
    1,
    'neko-discord',
    'admin',
    '<bcrypt hash of your password, you can use an online hasher with 10 rounds>',
    NOW(),
    NOW()
);
```

3. Create a .env file with at least the following variables. See the section below for all configuration options.

```env
DISCORD_TOKEN=<your Discord bot token>
DISCORD_CLIENT_ID=<your Discord client ID>

DB_PW=<the password you set in the above step>

NEKO_DO_URL=<URL at which neko-do is hosted>
NEKO_DO_USER=neko-discord
NEKO_DO_PW=<password to login to neko-do with>
HOST_URL=<URL at which neko-do can make callbacks back to this app>
```

4. Create the Discord commands by running `npm run deploy-commands` (WIP)

5. Run the project as a Docker container.

```bash
docker build . -t neko-discord
docker run --env-file .env -p 8080:8080 neko-discord
```

## Configuration options

* **DISCORD_TOKEN**: Your Discord bot token.
* **DISCORD_CLIENT_ID**: Your Discord client ID.
* **DB_ADDR**: The address of your Postgres server. Defaults to 127.0.0.1.
* **DB_USER**: The user to login to the database as. Defaults to "neko_herder_discord". This user
should have all privileges on the database also named "neko_herder_discord".
* **DB_PW**: The password to login to the database with.
* **NEKO_DO_URL**: The address at which neko-do can be contacted.
* **NEKO_DO_USER**: The name of the user to login to neko-do with.
* **NEKO_DO_PW**: The password to login to neko-do with.
* **HOST_URL**: The address that neko-do should use to perform callbacks to this service with.
* **EXPRESS_PORT**: The port to start the Express server on.
