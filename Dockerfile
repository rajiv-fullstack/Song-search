# Note! If you make changes it in this file, to rebuild it use:
#   docker-compose build client
#

FROM node:8.9.4

ADD songsearch/client/package.json /package.json
RUN yarn

ENV NODE_PATH=/node_modules
ENV PATH=$PATH:/node_modules/.bin
WORKDIR /app
ADD songsearch/client /app

EXPOSE 3000


ENTRYPOINT ["/bin/bash", "/app/bin/run.sh"]
CMD ["start"]
