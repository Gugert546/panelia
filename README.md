# React + TypeScript + Vite

# Frontend deployment
npm run build - lag en frontend build
firebase deploy - laster opp og deployer frontend build til firebase hosting

# Backend deployment
docker build -t <navn>
- lokal test `docker run -p 8080:8080 your-backend-name`
docker tag your-backend-name gcr.io/panelia/your-backend-name //tagger docker-imaget
docker push gcr.io/your-project-id/your-backend-name  //pusher image til google repository
gcloud run deploy your-backend-name --image gcr.io/panelia/your-backend-name --platform managed --region us-central1  --allow-unauthenticated // deploy på google cloud run

