# rei

## Overview
A fast and simple webserver for your files:

- files/directories browser
- drag-and-drop uploader
- lightweight
- read-only mode
- follow symlinks
- user/pass access
- zip file folder download
- qrcode generation

## Install
```console
$ go install https://github.com/fiwippi/rei.git
```

## Usage
```sh
% ./rei --help
usage: ./rei ~/directory-to-serve
  -disable-auth
        disable authentication
  -follow-symlinks
        follow symlinks
  -host string
        host to bind to
  -pass string
        password for log in
  -pass-stdin
        read the password from stdin
  -port string
        port to bind to (default "8000")
  -read-only
        read only
  -show-hidden
        show hidden files
  -user string
        username for log in

% ./rei -host 192.168.100.33 ~/storage
```

## License
`BSD-3-Clause`
