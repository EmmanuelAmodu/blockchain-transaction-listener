# On chain activity listener

### How to run the app

1. Create a new file `.env` based on the `.env.example`

2. Try to build the application

```
npm run build
```

3. Login to Google Cloud
   (gcloud needs to be installed for this: https://cloud.google.com/sdk/docs/install)

```
npm run auth
```

4. Setup pubsub

```
npm run pubsub:setup
```

5. Start the application and enjoy the ride

```
npm run start:dev
```

### PubSub UI

Open: http://localhost:7200/

Make sure `current host` points to on `http://localhost:8086` on the UI.

Click on `Attach new project` and the name should be `onionfi-preprod`.

You should see all the topics and subscriptions already created.
