package rei

import (
	"github.com/rs/zerolog"
	"log"
	"os"
)

var Log zerolog.Logger

// Create the logger
func createLogger(logDir string, logToConsole, logToFile bool) {
	var err error
	var logFile *os.File
	var consoleWriter zerolog.ConsoleWriter

	// Creates a file for writing logs to
	if logToFile {
		logFile, err = os.OpenFile(logDir+"rei.log", os.O_APPEND|os.O_CREATE|os.O_RDWR, 0644)
		if err != nil {
			log.Fatalf("Error creating logger: %s", err.Error())
		}
	}

	// Creates the console logger
	if logToConsole {
		consoleWriter = zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: "15:04:05"}
	}

	// Combine separate loggers into the main logger
	var w zerolog.LevelWriter
	if logToConsole && logToFile {
		w = zerolog.MultiLevelWriter(consoleWriter, logFile)
	} else if logToConsole && !logToFile {
		w = zerolog.MultiLevelWriter(consoleWriter)
	} else if !logToConsole && logToFile {
		w = zerolog.MultiLevelWriter(logFile)
	} else {
		return
	}

	Log = zerolog.New(w).With().Timestamp().Logger()
}
