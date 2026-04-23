# React + TypeScript + Vite

# Frontend deployment
```npm run build``` - lag en frontend build <br>
```firebase deploy``` - laster opp og deployer frontend build til firebase hosting
# Frontend utvikling
```npm run dev``` -kjører frontend lokalt

# Backend utvilking
``` npm run server``` kjører serveren lokalt

# Backend deployment
```docker build -t panelia-server:latest .``` // lokal test `docker run -p 8080:8080 your-backend-name` <br>
```docker tag panelia-server gcr.io/panelia/panelia-server``` //tagger docker-imaget <br>
```docker push gcr.io/panelia/panelia-server```  //pusher image til google repository <br>
```gcloud run deploy panelia-server --image gcr.io/panelia/panelia-server --platform managed --region europe-west1  --allow-unauthenticated``` // deploy på google cloud run <br>
```docker build -t panelia-server:latest . && docker tag panelia-server:latest gcr.io/panelia/panelia-server:latest && docker push gcr.io/panelia/panelia-server:latest && gcloud run deploy panelia-server --image gcr.io/panelia/panelia-server:latest --platform managed --region europe-west1 --allow-unauthenticated```

