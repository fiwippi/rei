package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/fiwippi/rei/internal/log"
)

func main() {
	host := flag.String("host", "", "host to bind to")
	port := flag.String("port", "8000", "port to bind to")
	user := flag.String("user", "", "username for log in")
	pass := flag.String("pass", "", "password for log in")
	hidden := flag.Bool("show-hidden", false, "show hidden files")
	ro := flag.Bool("read-only", false, "read only")
	sym := flag.Bool("follow-symlinks", false, "follow symlinks")
	disableAuth := flag.Bool("disable-auth", false, "disable authentication")
	passStdin := flag.Bool("pass-stdin", false, "read the password from stdin")

	flag.Usage = func() {
		fmt.Printf("usage: ./rei ~/directory-to-serve\n")
		flag.PrintDefaults()
	}

	var root string
	if flag.Parse(); len(flag.Args()) > 0 {
		// Get the root from the first arg
		root = flag.Args()[0]
		// Parse the password from stdin
		if *passStdin {
			reader := bufio.NewReader(os.Stdin)
			input, err := reader.ReadString('\n')
			if err != nil {
				log.Fatal().Err(err).Msg("failed to read pass from stdin")
			}
			*pass = strings.TrimSpace(input) // otherwise, we would have a blank line
		}
	} else {
		flag.Usage()
		os.Exit(1)
	}

	s, err := NewServer(*host, *port, *user, *pass, root, !*hidden, *ro, *sym, *disableAuth)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create server")
	}

	if err := s.ListenAndServe(); err != nil {
		log.Fatal().Err(err).Msg("failed to run server")
	}
}
