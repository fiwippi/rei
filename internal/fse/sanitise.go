package fse

import (
	"strings"
)

var illegalChars = []rune{'<', '>', ':', '"', '\\', '/', '|', '?', '*'}

// Sanitise cleans up an input filename to ensure it's
// save for saving to the filesystem
func Sanitise(input string) string {
	var sb strings.Builder
	for _, r := range input {
		for _, c := range illegalChars {
			if r == c {
				sb.WriteRune('_')
				continue
			}
		}
		sb.WriteRune(r)
	}

	return strings.TrimRight(sb.String(), ".")
}

func SanitiseFilepath(input string) string {
	parts := strings.Split(input, "/")
	var sb strings.Builder
	if strings.HasPrefix(input, "/") {
		sb.WriteRune('/')
	}
	for _, p := range parts {
		sb.WriteString(Sanitise(p))
		sb.WriteRune('/')
	}
	remade := sb.String()
	if !strings.HasSuffix(input, "/") {
		remade = strings.TrimSuffix(remade, "/")
	}

	return remade
}

func IsSanitised(input string) bool {
	return input == Sanitise(input)
}
