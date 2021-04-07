package rei

import (
	"github.com/rs/zerolog"
	"log"
	"os"
)

var Log zerolog.Logger

// Create the logger
func init() {
	// Creates a file for writing logs to
	logFile, err := os.OpenFile("rei.log", os.O_APPEND|os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		log.Fatalf("Error creating logger: %s", err.Error())
	}

	// Creates the console logger
	consoleWriter := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: "15:04:05"}

	// Combine separate loggers into the main logger
	w := zerolog.MultiLevelWriter(consoleWriter, logFile)
	Log = zerolog.New(w).With().Timestamp().Logger()
}
