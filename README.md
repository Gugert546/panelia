# React + TypeScript + Vite

# Frontend deployment
```npm run build``` - lag en frontend build <br>
```firebase deploy``` - laster opp og deployer frontend build til firebase hosting
# Frontend utvikling
```npm run dev``` -kjører frontend lokalt

# Backend utvilking
``` npm run server``` kjører serveren lokalt

# Backend deployment
```docker build -t <navn>``` // lokal test `docker run -p 8080:8080 your-backend-name` <br>
```docker tag your-backend-name gcr.io/panelia/your-backend-name``` //tagger docker-imaget <br>
```docker push gcr.io/your-project-id/your-backend-name```  //pusher image til google repository <br>
```gcloud run deploy your-backend-name --image gcr.io/panelia/your-backend-name --platform managed --region us-central1  --allow-unauthenticated``` // deploy på google cloud run <br>

