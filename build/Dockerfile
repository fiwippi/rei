FROM golang:latest as builder
COPY . /reiSrc
RUN cd /reiSrc && make
ENTRYPOINT [ "sh" ]

FROM alpine
ENV UID="1000" GID="1000" HOST="0.0.0.0" PORT="8001" PREFIX="/" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared" READONLY="false"
EXPOSE 8001
RUN apk add --no-cache su-exec
COPY --from=builder /reiSrc/bin/rei /rei
RUN echo -e 'exec su-exec ${UID}:${GID} /rei -host ${HOST} -port ${PORT} -skip-hidden=${SKIP_HIDDEN_FILES} -read-only=${READONLY} -follow-symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} ${DATADIR}'>> /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]
