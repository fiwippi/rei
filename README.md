# rei

![e](assets/example.gif)

## Overview
A fast and simple webserver for your files:

- files/directories browser & handler
- drag-and-drop uploader
- lightweight
- keyboard navigation
- fast golang static server
- read-only mode
- user/pass access (only 1 account supported for now)

## Install
```console
# Clone the repo
$ git clone https://github.com/fiwippi/rei.git

# Change the working directory to rei
$ cd rei

# Build rei
$ make build
```

## Usage
```sh
% ./rei --help

% ./rei -host 192.168.100.33 ~/storage
```

## Notes
- This is forked from [gossa](https://github.com/pldubouilh/gossa)
- Press `Ctrl + h` to see all the UI/keyboard shortcuts.
- Instructions for docker are in the `build/` directory

## License
`MIT`
