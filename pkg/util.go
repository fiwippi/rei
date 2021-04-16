package rei

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"errors"
	"io/fs"
	"io/ioutil"
	"path/filepath"
	"strconv"
	"strings"
)

// Walks through a directory recursively and zips all files
func walkZip(wz *zip.Writer, fp, baseInZip string) error {
	files, err := ioutil.ReadDir(fp)
	if err != nil {
		return err
	}

	for _, file := range files {
		if !file.IsDir() {
			data, err := ioutil.ReadFile(fp + file.Name())
			if err != nil {
				return err
			}

			f, err := wz.Create(baseInZip + file.Name())
			if err != nil {
				return err
			}

			_, err = f.Write(data)
			if err != nil {
				return err
			}
		} else if file.IsDir() {
			newBase := fp + file.Name() + "/"
			err := walkZip(wz, newBase, baseInZip+file.Name()+"/")
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// Ensures paths which the user is trying to access are valid
func validPath(p string) (string, error) {
	joined := filepath.Join(initPath, strings.TrimPrefix(p, fsPath))
	fp, absErr := filepath.Abs(joined)
	sl, _ := filepath.EvalSymlinks(fp) // Symlink error can be ignored since length of sl will be zero

	// Error returned if:
	// 1. Can't resolve absolute path or symlink
	// 2. The filepath does not begin with the dir rei is serving (it's out of bounds)
	// 3. File is hidden and hidden files functionality is off
	// 4. File is symlink and symlink functionality is off
	if absErr != nil || !strings.HasPrefix(fp, initPath) || skipHidden && strings.Contains(p, "/.") || !symlinks && len(sl) > 0 && !strings.HasPrefix(sl, initPath) {
		return "", errors.New("invalid path")
	}

	return fp, nil
}

// Represents a file's size as a readable string
func humanise(bytes int64) string {
	b := float64(bytes)
	u := 0
	for {
		if b < 1024 {
			return strconv.FormatFloat(b, 'f', 1, 64) + [9]string{"B", "k", "M", "G", "T", "P", "E", "Z", "Y"}[u]
		}
		b = b / 1024
		u++
	}
}

// Reads string from file
func readFileStr(f fs.FS, path string) (string, error) {
	fileBytes, err := fs.ReadFile(f, path)
	if err != nil {
		return "", err
	}

	return string(fileBytes), nil
}

// Encodes file to Base64 string
func fileToBase64(f fs.FS, path string) (string, error) {
	var b bytes.Buffer

	file, err := f.Open(path)
	if err != nil {
		return "", err
	}

	_, err = b.ReadFrom(file)
	if err != nil {
		return "", err
	}

	maxEncLen := base64.StdEncoding.EncodedLen(len(b.Bytes()))
	encBuf := make([]byte, maxEncLen)
	base64.StdEncoding.Encode(encBuf, b.Bytes())

	return string(encBuf), nil
}

// Gets the font awesome style from the file extension
func fontAwesomeType(ext string) string {
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
