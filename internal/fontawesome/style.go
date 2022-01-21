package fontawesome

import (
	"io/fs"
	"strings"
)

func Style(f fs.FileInfo) string {
	if f.IsDir() {
		return "fa-folder-open"
	} else if !strings.Contains(f.Name(), ".") {
		return "fa-file-text-o"
	}

	parts := strings.Split(f.Name(), ".")
	ext := strings.TrimLeft(parts[len(parts)-1], ".")

	if _, found := codeFiles[ext]; found {
		return "fa-file-code-o"
	} else if _, found := wordFiles[ext]; found {
		return "fa fa-file-word-o"
	} else if _, found := excelFiles[ext]; found {
		return "fa fa-file-excel-o"
	} else if _, found := pptFiles[ext]; found {
		return "fa fa-file-powerpoint-o"
	} else if _, found := archiveFiles[ext]; found {
		return "fa-file-archive-o"
	} else if _, found := audioFiles[ext]; found {
		return "fa-file-audio-o"
	} else if _, found := videoFiles[ext]; found {
		return "fa-file-video-o"
	} else if _, found := imageFiles[ext]; found {
		return "fa-file-image-o"
	} else if _, found := appleFiles[ext]; found {
		return "fa-apple"
	}

	switch ext {
	case "pdf":
		return "fa-file-pdf-o"
	case "apk":
		return "fa-android"
	case "exe":
		return "fa-windows"
	}
	return "fa-file-text-o"
}
