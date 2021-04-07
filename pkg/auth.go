package rei

import (
	_ "crypto/md5"
	"fmt"
	"github.com/shaj13/go-guardian/v2/auth"
	"github.com/shaj13/go-guardian/v2/auth/strategies/digest"
	"github.com/shaj13/libcache"
	_ "github.com/shaj13/libcache/fifo"
	"net/http"
	"time"
)

// Adapted from: https://github.com/shaj13/go-guardian/blob/master/_examples/digest/main.go

// User and Pass of the Admin
var username, password string

// Digest strategy used to authenticate the user
var strategy *digest.Digest

// Session manager to have persistent auth
var c libcache.Cache

// Create the cache
func init() {
	c = libcache.FIFO.New(5)
	c.SetTTL(time.Minute * 10)
	c.RegisterOnExpired(func(key, _ interface{}) {
		c.Delete(key)
	})
	strategy = digest.New(validateUser, c)
}

// Given a username, returns its password and the accompanying user info
func validateUser(userName string) (string, auth.Info, error) {
	if userName == username {
		return password, auth.NewDefaultUser("admin", "1", nil, nil), nil
	}

	return "", nil, fmt.Errorf("Invalid credentials")
}

// The authentication middleware
func middleware(next http.Handler) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if user == "" && pass == "" { // If no user and password then skip auth
			next.ServeHTTP(w, r)
		} else {
			user, err := strategy.Authenticate(r.Context(), r)
			if err != nil {
				code := http.StatusUnauthorized
				w.Header().Add("WWW-Authenticate", strategy.GetChallenge())
				http.Error(w, http.StatusText(code), code)
				Log.Error().Err(err).Msg("Auth error")
				return
			}
			Log.Info().Str("username", user.GetUserName()).Msg("User Authenticated")
			next.ServeHTTP(w, r)
		}
	})
}
