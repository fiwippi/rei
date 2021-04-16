FROM golang:1.16.3-alpine3.13 as builder

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/rei

FROM alpine

COPY --from=builder /app/bin/rei /rei

ENV HOST="0.0.0.0" PORT="8001" PREFIX="/"
ENV FOLLOW_SYMLINKS="false" SKIP_HIDDEN_FILES="true"
ENV DATADIR="/shared" READONLY="false"

EXPOSE 8001
RUN echo -e '/rei -host ${HOST} -port ${PORT} -skip-hidden=${SKIP_HIDDEN_FILES} -read-only=${READONLY} -follow-symlinks=${FOLLOW_SYMLINKS} --prefix=${PREFIX} ${DATADIR}'>> /start.sh
ENTRYPOINT [ "sh", "/start.sh" ]