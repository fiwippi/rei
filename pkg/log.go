package rei

import (
	"github.com/rs/zerolog"
	"os"
)

var log zerolog.Logger

// Create the logger
func init() {
	consoleWriter := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: "15:04:05"}
	log = zerolog.New(consoleWriter).With().Timestamp().Logger()
}
