# 1
FROM golang:1.16.3-alpine3.13 as builder

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/rei

#2
FROM alpine

COPY --from=builder /app/bin/rei /rei

ENV REI_USER=""
ENV REI_PASS=""
ENV REI_READ_ONLY="false"
ENV REI_SHOW_HIDDEN_FILES="false"
ENV REI_FOLLOW_SYMLINKS="false"
ENV REI_DISABLE_AUTH="false"
ENV GIN_MODE="release"

RUN mkdir /shared
EXPOSE 8000
ENTRYPOINT /rei -host=0.0.0.0 -port=8000 -show-hidden=${REI_SHOW_HIDDEN_FILES} -read-only=${REI_READ_ONLY} -follow-symlinks=${REI_FOLLOW_SYMLINKS} -disable-auth=${REI_DISABLE_AUTH} -user=${REI_USER} -pass=${REI_PASS} /shared