FROM golang:latest as builder
COPY . /gossaSrc
RUN cd /gossaSrc && make
ENTRYPOINT [ "sh" ]

FROM alpine
ENV UID="1000" GID="1000" HOST="0.0.0.0" PORT="8001" PREFIX="/" FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true" DATADIR="/shared" READONLY="false"
EXPOSE 8001
RUN apk add --no-cache su-exec
COPY --from=builder /gossaSrc/bin/gossa /gossa
RUN echo -e 'exec su-exec ${UID}:${GID} /gossa -host ${HOST} -port ${PORT} -skip-hidden=${SKIP_HIDDEN_FILES} -read-only=${READONLY} -follow-symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} ${DATADIR}'>> /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]
