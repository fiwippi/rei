package rei

import (
	"fmt"
	"net/http"
)

// Sends a HTTP Code tot the user  with an optional error parameter
func sendHTTPResp(w http.ResponseWriter, code int, err error) {
	// The actual error message is kept private by the web server,
	// only the error code is public to the user
	if err != nil {
		Log.Error().Err(err).Msg("Error encountered")
	}
	msg := fmt.Sprintf("Status %v", code)
	http.Error(w, msg, code)
}
