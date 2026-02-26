# Use the official Node.js image as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy only the server folder and package files
COPY .env .env
COPY package*.json ./          
COPY server ./server           

# Install dependencies
RUN npm install --omit=dev

# Expose the port the server will run on
EXPOSE 3003

# Set the environment variable for production
ENV NODE_ENV=production

# Command to run the server
CMD ["npm", "run","server"]