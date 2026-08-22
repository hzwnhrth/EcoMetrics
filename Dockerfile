# Use the official Node.js image as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the Vite default port
EXPOSE 5173

# Start the Vite development server and expose to network
CMD ["npm", "run", "dev", "--", "--host"]
