package fse

import (
	"io/ioutil"
	"sort"
	"strings"

	"github.com/fiwippi/rei/internal/fontawesome"
)

type File struct {
	folder  bool
	Icon    string `json:"icon"`     // Font awesome icon
	ModTime int64  `json:"mod_time"` // Mod time of the file
	Name    string `json:"name"`
	Size    int64  `json:"size"`
}

func ReadDir(path string, skipHidden bool) ([]File, error) {
	dir, err := ioutil.ReadDir(path)
	if err != nil {
		return nil, err
	}

	files := make([]File, 0, len(dir))
	for _, f := range dir {
		a := strings.HasPrefix(f.Name(), ".")
		b := strings.HasPrefix(f.Name(), "~$") // Microsoft office files
		if skipHidden && (a || b) {
			continue
		}

		file := File{
			folder:  f.IsDir(),
			Icon:    fontawesome.Style(f),
			ModTime: f.ModTime().Unix(),
			Name:    f.Name(),
			Size:    f.Size(),
		}
		files = append(files, file)
	}
	sort.SliceStable(files, func(i, j int) bool {
		return files[i].folder && !files[j].folder
	})

	return files, nil
}
