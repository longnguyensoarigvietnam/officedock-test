# Use the official Node.js image as a base
FROM node:21-alpine3.17

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install the dependencies
RUN npm install


# Copy the rest of the application files to the container
COPY . .

# Build the application
RUN npm run build

#Specifies the port to run on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]