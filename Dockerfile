# Use the official Node.js 14 image.
# Check https://hub.docker.com/_/node to select a new base image
FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

# Your application binds to port 2000, so use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 3000

CMD [ "node", "index.js" ]
